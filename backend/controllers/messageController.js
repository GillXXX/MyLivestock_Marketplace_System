const db = require("../config/db");
const { getFileUrl } = require("../middleware/uploadMiddleware");

const TYPING_TIMEOUT_MS = 3000;
const typingState = new Map();

const typingKey = (conversationId, userId) => `${conversationId}:${userId}`;

const isTyping = (conversationId, userId) => {
  const lastPing = typingState.get(typingKey(conversationId, userId));
  return Boolean(lastPing) && Date.now() - lastPing < TYPING_TIMEOUT_MS;
};

const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const query =
      role === "farmer"
        ? "c.farmer_id = ? AND c.farmer_deleted_at IS NULL"
        : "c.buyer_id = ? AND c.buyer_deleted_at IS NULL";

    const [conversations] = await db.query(
      `SELECT
        c.id,
        c.listing_id,
        c.farmer_id,
        c.buyer_id,
        c.farmer_last_read_at,
        c.buyer_last_read_at,
        l.livestock_type,
        l.category,
        l.unit,
        l.breed,
        farmer.full_name AS farmer_name,
        farmer.is_verified AS farmer_is_verified,
        buyer.full_name AS buyer_name
      FROM conversations c
      JOIN livestock_listings l ON c.listing_id = l.id
      JOIN users farmer ON c.farmer_id = farmer.id
      JOIN users buyer ON c.buyer_id = buyer.id
      WHERE ${query}`,
      [userId]
    );

    // Each conversation's latest message, fetched for all of them in one
    // grouped query. (A per-conversation subquery in the join above was
    // ~10x slower on MariaDB, and this list is polled every few seconds by
    // everyone with Messages open.) Message ids only grow, so the highest
    // id is the latest message.
    const latestByConversation = new Map();

    if (conversations.length > 0) {
      const [latestMessages] = await db.query(
        `SELECT m.conversation_id, m.message, m.sender_id, m.created_at, m.attachment_type, m.deleted_at
         FROM messages m
         JOIN (
           SELECT MAX(id) AS id FROM messages WHERE conversation_id IN (?) GROUP BY conversation_id
         ) latest ON m.id = latest.id`,
        [conversations.map((conversation) => conversation.id)]
      );

      latestMessages.forEach((m) => latestByConversation.set(m.conversation_id, m));
    }

    const withLatest = conversations
      .map((conversation) => {
        const latest = latestByConversation.get(conversation.id);
        const otherUserId =
          role === "farmer" ? conversation.buyer_id : conversation.farmer_id;

        return {
          ...conversation,
          last_message: latest?.message ?? null,
          last_sender_id: latest?.sender_id ?? null,
          last_time: latest?.created_at ?? null,
          last_attachment_type: latest?.attachment_type ?? null,
          last_deleted_at: latest?.deleted_at ?? null,
          other_typing: isTyping(conversation.id, otherUserId),
        };
      })
      // Newest conversation first; ones with no messages yet last.
      .sort((a, b) => new Date(b.last_time || 0) - new Date(a.last_time || 0));

    res.json(withLatest);
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({ message: "Server error loading conversations" });
  }
};

const verifyConversationAccess = async (conversationId, userId) => {
  const [rows] = await db.query(
    "SELECT farmer_id, buyer_id, farmer_deleted_at, buyer_deleted_at FROM conversations WHERE id = ?",
    [conversationId]
  );

  if (rows.length === 0) {
    return { ok: false, status: 404, message: "Conversation not found" };
  }

  if (rows[0].farmer_id !== userId && rows[0].buyer_id !== userId) {
    return { ok: false, status: 403, message: "Not authorized for this conversation" };
  }

  return { ok: true, conversation: rows[0] };
};

// The open chat polls this every couple of seconds. With ?after=<last
// message id> only newer messages come back (plus which messages are
// deleted, since deleting changes an older row), and the read mark only
// runs when something new arrived — so an idle chat costs a few indexed
// lookups instead of resending its whole history.
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    const afterId = Number.parseInt(req.query.after, 10) || 0;

    const access = await verifyConversationAccess(conversationId, userId);

    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const [messages] = await db.query(
      `SELECT
        m.id,
        m.sender_id,
        m.message,
        m.attachment_url,
        m.attachment_type,
        m.deleted_at,
        m.created_at,
        u.full_name AS sender_name,
        l.id AS listing_id,
        l.livestock_type AS listing_livestock_type,
        l.category AS listing_category,
        l.unit AS listing_unit,
        l.breed AS listing_breed,
        l.price AS listing_price,
        l.image_url AS listing_image_url,
        l.status AS listing_status
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN livestock_listings l ON m.listing_id = l.id
      WHERE m.conversation_id = ? AND m.id > ?
      ORDER BY m.created_at ASC, m.id ASC`,
      [conversationId, afterId]
    );

    const isFarmer = access.conversation.farmer_id === userId;
    const otherUserId = isFarmer
      ? access.conversation.buyer_id
      : access.conversation.farmer_id;

    // Nothing new since the last poll means nothing new to mark as read.
    if (afterId === 0 || messages.length > 0) {
      const readColumn = isFarmer ? "farmer_last_read_at" : "buyer_last_read_at";

      await db.query(
        `UPDATE conversations SET ${readColumn} = NOW() WHERE id = ?`,
        [conversationId]
      );
    }

    const [deletedRows] =
      afterId > 0
        ? await db.query(
            "SELECT id FROM messages WHERE conversation_id = ? AND deleted_at IS NOT NULL",
            [conversationId]
          )
        : [[]];

    // The listing this chat is about, and the buyer's open deal for it if
    // there is one — lets the buyer "Proceed to Negotiation" from the chat,
    // and both sides negotiate its terms there.
    const [[deal]] = await db.query(
      `SELECT
        l.id,
        l.livestock_type,
        l.category,
        l.breed,
        l.price,
        l.quantity,
        l.unit,
        l.weight,
        l.location,
        l.image_url,
        l.status,
        seller.full_name AS seller_name,
        t.id AS open_transaction_id,
        t.workflow_step AS open_transaction_step,
        t.quantity AS deal_quantity,
        t.amount AS deal_amount,
        t.offer_unit_price,
        t.offer_pickup_date,
        t.offer_pickup_place,
        t.offer_payment,
        t.offer_note,
        t.offer_by,
        t.terms_agreed_at,
        t.actual_weight_kg,
        (t.cancel_requested_at IS NOT NULL AND t.cancel_outcome IS NULL) AS deal_cancel_pending
      FROM conversations c
      JOIN livestock_listings l ON c.listing_id = l.id
      JOIN users seller ON c.farmer_id = seller.id
      LEFT JOIN transactions t ON t.id = (
        SELECT t2.id FROM transactions t2
        WHERE t2.listing_id = c.listing_id AND t2.buyer_id = c.buyer_id AND t2.status = 'Pending'
        ORDER BY t2.id DESC
        LIMIT 1
      )
      WHERE c.id = ?`,
      [conversationId]
    );

    res.json({
      messages,
      deletedIds: deletedRows.map((row) => row.id),
      otherTyping: isTyping(conversationId, otherUserId),
      deal: deal || null,
    });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ message: "Server error loading messages" });
  }
};

const sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { conversationId } = req.params;
    const message = req.body.message?.trim() || null;
    const file = req.file;

    if (!message && !file) {
      return res.status(400).json({ message: "Message or attachment is required" });
    }

    const access = await verifyConversationAccess(conversationId, senderId);

    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const attachmentUrl = file ? getFileUrl(file, req) : null;
    const attachmentType = file ? (file.mimetype.startsWith("video/") ? "video" : "image") : null;

    await db.query(
      "INSERT INTO messages (conversation_id, sender_id, message, attachment_url, attachment_type) VALUES (?, ?, ?, ?, ?)",
      [conversationId, senderId, message, attachmentUrl, attachmentType]
    );

    await db.query(
      "UPDATE conversations SET farmer_deleted_at = NULL, buyer_deleted_at = NULL WHERE id = ?",
      [conversationId]
    );

    typingState.delete(typingKey(conversationId, senderId));

    res.status(201).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ message: "Server error sending message" });
  }
};

const deleteConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const access = await verifyConversationAccess(conversationId, userId);

    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const isFarmer = access.conversation.farmer_id === userId;
    const deleteColumn = isFarmer ? "farmer_deleted_at" : "buyer_deleted_at";

    await db.query(
      `UPDATE conversations SET ${deleteColumn} = NOW() WHERE id = ?`,
      [conversationId]
    );

    const otherAlreadyDeleted = isFarmer
      ? access.conversation.buyer_deleted_at
      : access.conversation.farmer_deleted_at;

    if (otherAlreadyDeleted) {
      await db.query("DELETE FROM messages WHERE conversation_id = ?", [conversationId]);
      await db.query("DELETE FROM conversations WHERE id = ?", [conversationId]);
    }

    res.json({ message: "Conversation removed" });
  } catch (error) {
    console.error("Delete conversation error:", error);
    res.status(500).json({ message: "Server error removing conversation" });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId, messageId } = req.params;

    const access = await verifyConversationAccess(conversationId, userId);

    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const [[targetMessage]] = await db.query(
      "SELECT sender_id FROM messages WHERE id = ? AND conversation_id = ?",
      [messageId, conversationId]
    );

    if (!targetMessage) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (targetMessage.sender_id !== userId) {
      return res.status(403).json({ message: "You can only delete your own messages" });
    }

    await db.query(
      "UPDATE messages SET message = NULL, attachment_url = NULL, attachment_type = NULL, listing_id = NULL, deleted_at = NOW() WHERE id = ?",
      [messageId]
    );

    res.json({ message: "Message deleted" });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({ message: "Server error deleting message" });
  }
};

const forwardMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId, messageId } = req.params;
    const { targetConversationIds } = req.body;

    if (!Array.isArray(targetConversationIds) || targetConversationIds.length === 0) {
      return res.status(400).json({ message: "Select at least one conversation to forward to" });
    }

    const access = await verifyConversationAccess(conversationId, userId);

    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const [[original]] = await db.query(
      "SELECT message, attachment_url, attachment_type, deleted_at FROM messages WHERE id = ? AND conversation_id = ?",
      [messageId, conversationId]
    );

    if (!original || original.deleted_at) {
      return res.status(404).json({ message: "Message not found" });
    }

    let forwardedCount = 0;

    for (const targetId of targetConversationIds) {
      const targetAccess = await verifyConversationAccess(targetId, userId);
      if (!targetAccess.ok) continue;

      await db.query(
        "INSERT INTO messages (conversation_id, sender_id, message, attachment_url, attachment_type) VALUES (?, ?, ?, ?, ?)",
        [targetId, userId, original.message, original.attachment_url, original.attachment_type]
      );

      await db.query(
        "UPDATE conversations SET farmer_deleted_at = NULL, buyer_deleted_at = NULL WHERE id = ?",
        [targetId]
      );

      forwardedCount += 1;
    }

    if (forwardedCount === 0) {
      return res.status(403).json({ message: "Not authorized for the selected conversations" });
    }

    res.status(201).json({ message: "Message forwarded" });
  } catch (error) {
    console.error("Forward message error:", error);
    res.status(500).json({ message: "Server error forwarding message" });
  }
};

const pingTyping = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const access = await verifyConversationAccess(conversationId, userId);

    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    typingState.set(typingKey(conversationId, userId), Date.now());

    res.status(204).end();
  } catch (error) {
    console.error("Typing ping error:", error);
    res.status(500).json({ message: "Server error updating typing status" });
  }
};

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
  deleteMessage,
  forwardMessage,
  deleteConversation,
  pingTyping,
};
