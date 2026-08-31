const db = require("../config/db");

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
        l.breed,
        farmer.full_name AS farmer_name,
        farmer.is_verified AS farmer_is_verified,
        buyer.full_name AS buyer_name,
        (
          SELECT m.message
          FROM messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) AS last_message,
        (
          SELECT m.sender_id
          FROM messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) AS last_sender_id,
        (
          SELECT m.created_at
          FROM messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) AS last_time
      FROM conversations c
      JOIN livestock_listings l ON c.listing_id = l.id
      JOIN users farmer ON c.farmer_id = farmer.id
      JOIN users buyer ON c.buyer_id = buyer.id
      WHERE ${query}
      ORDER BY last_time DESC`,
      [userId]
    );

    const withTyping = conversations.map((conversation) => {
      const otherUserId =
        role === "farmer" ? conversation.buyer_id : conversation.farmer_id;

      return {
        ...conversation,
        other_typing: isTyping(conversation.id, otherUserId),
      };
    });

    res.json(withTyping);
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

const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const access = await verifyConversationAccess(conversationId, userId);

    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const [messages] = await db.query(
      `SELECT
        m.id,
        m.sender_id,
        m.message,
        m.created_at,
        u.full_name AS sender_name,
        l.id AS listing_id,
        l.livestock_type AS listing_livestock_type,
        l.breed AS listing_breed,
        l.price AS listing_price,
        l.image_url AS listing_image_url,
        l.status AS listing_status
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN livestock_listings l ON m.listing_id = l.id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at ASC`,
      [conversationId]
    );

    const isFarmer = access.conversation.farmer_id === userId;
    const readColumn = isFarmer ? "farmer_last_read_at" : "buyer_last_read_at";

    await db.query(
      `UPDATE conversations SET ${readColumn} = NOW() WHERE id = ?`,
      [conversationId]
    );

    const otherUserId = isFarmer
      ? access.conversation.buyer_id
      : access.conversation.farmer_id;

    res.json({
      messages,
      otherTyping: isTyping(conversationId, otherUserId),
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
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    const access = await verifyConversationAccess(conversationId, senderId);

    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    await db.query(
      "INSERT INTO messages (conversation_id, sender_id, message) VALUES (?, ?, ?)",
      [conversationId, senderId, message]
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
  deleteConversation,
  pingTyping,
};
