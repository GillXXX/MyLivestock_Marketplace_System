const db = require("../config/db");
const bcrypt = require("bcryptjs");
const { isStrongPassword, PASSWORD_REQUIREMENTS_MESSAGE } = require("../utils/validators");

const getBuyerDashboard = async (req, res) => {
  try {
    const buyerId = req.user.id;

    const [userRows] = await db.query(
      "SELECT id, full_name, location, profile_image, created_at FROM users WHERE id = ?",
      [buyerId]
    );

    const [availableListings] = await db.query(
      `SELECT
        l.id,
        l.livestock_type,
        l.category,
        l.unit,
        l.breed,
        l.price,
        l.age,
        l.location,
        l.image_url,
        l.created_at,
        u.full_name AS seller_name
      FROM livestock_listings l
      JOIN users u ON l.farmer_id = u.id
      WHERE l.status = 'Available'
      ORDER BY l.created_at DESC
      LIMIT 3`
    );

    const [availableCount] = await db.query(
      "SELECT COUNT(*) AS total FROM livestock_listings WHERE status = 'Available'"
    );

    const [sellerCount] = await db.query(
      "SELECT COUNT(DISTINCT farmer_id) AS total FROM livestock_listings WHERE status = 'Available'"
    );

    const [savedCount] = await db.query(
      "SELECT COUNT(*) AS total FROM favorites WHERE buyer_id = ?",
      [buyerId]
    );

    const [activeInquiries] = await db.query(
      "SELECT COUNT(*) AS total FROM inquiries WHERE buyer_id = ?",
      [buyerId]
    );

    const [completedPurchases] = await db.query(
      "SELECT COUNT(*) AS total FROM transactions WHERE buyer_id = ? AND status = 'Completed'",
      [buyerId]
    );

    const [favoriteRows] = await db.query(
      "SELECT listing_id FROM favorites WHERE buyer_id = ?",
      [buyerId]
    );

    const [recentInquiries] = await db.query(
      `SELECT 
        i.status,
        l.livestock_type,
        l.category,
        l.unit,
        l.breed
      FROM inquiries i
      JOIN livestock_listings l ON i.listing_id = l.id
      WHERE i.buyer_id = ?
      ORDER BY i.created_at DESC
      LIMIT 5`,
      [buyerId]
    );

    const [activity] = await db.query(
      `SELECT livestock_type, category, breed, price, unit, location, image_url, created_at
       FROM livestock_listings
       WHERE status = 'Available'
       ORDER BY created_at DESC
       LIMIT 5`
    );

    res.json({
      user: userRows[0],
      stats: {
        savedListings: savedCount[0].total,
        activeInquiries: activeInquiries[0].total,
        completedPurchases: completedPurchases[0].total,
        nearbySellers: sellerCount[0].total,
        availableListings: availableCount[0].total,
      },
      favoriteListingIds: favoriteRows.map((row) => row.listing_id),
      recommended: availableListings,
      recentInquiries,
      activity,
    });
  } catch (error) {
    console.error("Buyer dashboard error:", error);
    res.status(500).json({ message: "Server error loading buyer dashboard" });
  }
};

// Shared by getBuyerNotifications and markAllBuyerNotificationsRead so the
// "which notifications exist" logic can't drift between the two.
async function buildBuyerNotifications(buyerId) {
    const notifications = [];

    const [inquiries] = await db.query(
      `
      SELECT i.id, i.created_at, i.listing_id, l.livestock_type, l.breed, farmer.full_name AS seller_name,
        conv.id AS conversation_id,
        conv.buyer_last_read_at,
        (SELECT MAX(created_at) FROM messages m WHERE m.conversation_id = conv.id) AS last_message_at,
        (SELECT sender_id FROM messages m WHERE m.conversation_id = conv.id ORDER BY created_at DESC LIMIT 1) AS last_sender_id
      FROM inquiries i
      JOIN livestock_listings l ON i.listing_id = l.id
      JOIN users farmer ON l.farmer_id = farmer.id
      LEFT JOIN conversations conv ON conv.listing_id = i.listing_id AND conv.buyer_id = i.buyer_id
      WHERE i.buyer_id = ?
      ORDER BY i.created_at DESC
      LIMIT 10
      `,
      [buyerId]
    );

    inquiries.forEach((item) => {
      const lastMessageAt = item.last_message_at || item.created_at;
      // Unread whenever the seller has the last word and the buyer hasn't
      // opened this conversation since — so a brand-new reply flips this
      // back to Unread even if the thread was read long ago.
      const unread = Boolean(
        item.last_sender_id &&
          item.last_sender_id !== buyerId &&
          (!item.buyer_last_read_at || new Date(lastMessageAt) > new Date(item.buyer_last_read_at))
      );

      notifications.push({
        id: `I-${item.id}`,
        type: "Inquiry Status",
        title: unread ? "Seller replied" : "Inquiry Sent",
        message: unread
          ? `${item.seller_name} replied about your ${item.livestock_type} (${item.breed || "No breed"}) inquiry.`
          : `Your inquiry about ${item.livestock_type} (${item.breed || "No breed"}) was sent to ${item.seller_name}.`,
        time: lastMessageAt,
        status: unread ? "Unread" : "Read",
        conversationId: item.conversation_id || null,
      });
    });

    const [transactions] = await db.query(
      `
      SELECT t.id, t.workflow_step, t.status, t.created_at, l.livestock_type, farmer.full_name AS seller_name
      FROM transactions t
      JOIN livestock_listings l ON t.listing_id = l.id
      JOIN users farmer ON t.farmer_id = farmer.id
      WHERE t.buyer_id = ?
      ORDER BY t.created_at DESC
      LIMIT 10
      `,
      [buyerId]
    );

    transactions.forEach((item) => {
      notifications.push({
        id: `T-${item.id}`,
        type: "Transaction Update",
        title: `Transaction: ${item.workflow_step}`,
        message: `${item.livestock_type} deal with ${item.seller_name} is now at "${item.workflow_step}".`,
        time: item.created_at,
        status: item.status === "Completed" ? "Read" : "Unread",
        transactionId: item.id,
      });
    });

    // The seller's answer to each of this buyer's cancellation requests.
    const [cancelAnswers] = await db.query(
      `
      SELECT t.id, t.cancel_outcome, t.cancel_responded_at, l.livestock_type, farmer.full_name AS seller_name
      FROM transactions t
      JOIN livestock_listings l ON t.listing_id = l.id
      JOIN users farmer ON t.farmer_id = farmer.id
      WHERE t.buyer_id = ? AND t.cancel_outcome IS NOT NULL
      ORDER BY t.cancel_responded_at DESC
      LIMIT 10
      `,
      [buyerId]
    );

    const CANCEL_ANSWER_TEXT = {
      Approved: (item) => [
        "Cancellation approved",
        `${item.seller_name} approved your request — the ${item.livestock_type} order is cancelled.`,
      ],
      "Auto-approved": (item) => [
        "Cancellation approved",
        `${item.seller_name} didn't respond in time, so the ${item.livestock_type} order was cancelled automatically.`,
      ],
      Rejected: (item) => [
        "Cancellation rejected",
        `${item.seller_name} rejected your request to cancel the ${item.livestock_type} order. Message the seller to sort it out.`,
      ],
    };

    cancelAnswers.forEach((item) => {
      const [title, message] = CANCEL_ANSWER_TEXT[item.cancel_outcome](item);

      notifications.push({
        id: `CA-${item.id}`,
        type: "Transaction Update",
        title,
        message,
        time: item.cancel_responded_at,
        status: "Unread",
        transactionId: item.id,
      });
    });

    notifications.sort((a, b) => new Date(b.time) - new Date(a.time));

    return notifications;
}

const getBuyerNotifications = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const notifications = await buildBuyerNotifications(buyerId);

    const [readRows] = await db.query(
      "SELECT notification_key FROM buyer_notification_reads WHERE buyer_id = ?",
      [buyerId]
    );
    const readKeys = new Set(readRows.map((row) => row.notification_key));

    notifications.forEach((notif) => {
      // "Inquiry Status" derives its read state live from the conversation
      // itself (see buildBuyerNotifications) so a stale read-mark here
      // can't hide a genuinely new reply.
      if (notif.type !== "Inquiry Status" && readKeys.has(notif.id)) notif.status = "Read";
    });

    const totalAlerts = notifications.length;
    const unreadAlerts = notifications.filter((n) => n.status === "Unread").length;

    res.json({
      notifications,
      stats: {
        totalAlerts,
        unreadAlerts,
        inquiryUpdates: notifications.filter((n) => n.type === "Inquiry Status").length,
        transactionUpdates: notifications.filter((n) => n.type === "Transaction Update").length,
      },
    });
  } catch (error) {
    console.error("Buyer notifications error:", error);
    res.status(500).json({ message: "Server error loading notifications" });
  }
};

const markBuyerNotificationRead = async (req, res) => {
  try {
    const buyerId = req.user.id;

    await db.query(
      "INSERT IGNORE INTO buyer_notification_reads (buyer_id, notification_key) VALUES (?, ?)",
      [buyerId, req.params.id]
    );

    res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Mark buyer notification read error:", error);
    res.status(500).json({ message: "Server error updating notification" });
  }
};

const markAllBuyerNotificationsRead = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const notifications = await buildBuyerNotifications(buyerId);

    if (notifications.length > 0) {
      const values = notifications.map((notif) => [buyerId, notif.id]);
      await db.query(
        "INSERT IGNORE INTO buyer_notification_reads (buyer_id, notification_key) VALUES ?",
        [values]
      );
    }

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Mark all buyer notifications read error:", error);
    res.status(500).json({ message: "Server error updating notifications" });
  }
};

const changeBuyerPassword = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "Please fill in all password fields" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New passwords do not match" });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ message: PASSWORD_REQUIREMENTS_MESSAGE });
    }

    const [rows] = await db.query("SELECT password FROM users WHERE id = ?", [buyerId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, rows[0].password);

    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, buyerId]);

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Server error updating password" });
  }
};

module.exports = {
  getBuyerDashboard,
  getBuyerNotifications,
  markBuyerNotificationRead,
  markAllBuyerNotificationsRead,
  changeBuyerPassword,
};