const db = require("../config/db");
const bcrypt = require("bcryptjs");

const getBuyerDashboard = async (req, res) => {
  try {
    const buyerId = req.user.id;

    const [userRows] = await db.query(
      "SELECT id, full_name, location FROM users WHERE id = ?",
      [buyerId]
    );

    const [availableListings] = await db.query(
      `SELECT 
        l.id,
        l.livestock_type,
        l.breed,
        l.price,
        l.age,
        l.location,
        l.image_url,
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

    const [recentInquiries] = await db.query(
      `SELECT 
        i.status,
        l.livestock_type,
        l.breed
      FROM inquiries i
      JOIN livestock_listings l ON i.listing_id = l.id
      WHERE i.buyer_id = ?
      ORDER BY i.created_at DESC
      LIMIT 5`,
      [buyerId]
    );

    const [activity] = await db.query(
      `SELECT livestock_type, breed, price, location
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
      recommended: availableListings,
      recentInquiries,
      activity,
    });
  } catch (error) {
    console.error("Buyer dashboard error:", error);
    res.status(500).json({ message: "Server error loading buyer dashboard" });
  }
};

const getBuyerNotifications = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const notifications = [];

    const [inquiries] = await db.query(
      `
      SELECT i.id, i.status, i.created_at, i.listing_id, l.livestock_type, l.breed, farmer.full_name AS seller_name,
        (
          SELECT c.id FROM conversations c
          WHERE c.listing_id = i.listing_id AND c.buyer_id = i.buyer_id
          LIMIT 1
        ) AS conversation_id
      FROM inquiries i
      JOIN livestock_listings l ON i.listing_id = l.id
      JOIN users farmer ON l.farmer_id = farmer.id
      WHERE i.buyer_id = ?
      ORDER BY i.created_at DESC
      LIMIT 10
      `,
      [buyerId]
    );

    inquiries.forEach((item) => {
      notifications.push({
        id: `I-${item.id}`,
        type: "Inquiry Status",
        title: "Inquiry Sent",
        message: `Your inquiry about ${item.livestock_type} (${item.breed || "No breed"}) was sent to ${item.seller_name}.`,
        time: item.created_at,
        status: item.status === "Unread" ? "Unread" : "Read",
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

    notifications.sort((a, b) => new Date(b.time) - new Date(a.time));

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

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
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

module.exports = { getBuyerDashboard, getBuyerNotifications, changeBuyerPassword };