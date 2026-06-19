const db = require("../config/db");

const getAdminNotifications = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    const notifications = [];

    const [listings] = await db.query(`
      SELECT 
        l.id,
        l.livestock_type,
        l.breed,
        l.status,
        l.created_at,
        u.full_name AS farmer_name
      FROM livestock_listings l
      JOIN users u ON l.farmer_id = u.id
      ORDER BY l.created_at DESC
      LIMIT 10
    `);

    listings.forEach((item) => {
      notifications.push({
        id: `L-${item.id}`,
        type: "Listing Approval",
        title: "Livestock listing submitted",
        message: `${item.farmer_name} submitted a ${item.livestock_type} listing for review.`,
        time: item.created_at,
        status: item.status === "Pending" ? "Unread" : "Read",
      });
    });

    const [transactions] = await db.query(`
      SELECT 
        t.id,
        t.status,
        t.created_at,
        l.livestock_type,
        farmer.full_name AS farmer_name,
        buyer.full_name AS buyer_name
      FROM transactions t
      JOIN livestock_listings l ON t.listing_id = l.id
      JOIN users farmer ON t.farmer_id = farmer.id
      JOIN users buyer ON t.buyer_id = buyer.id
      ORDER BY t.created_at DESC
      LIMIT 10
    `);

    transactions.forEach((item) => {
      notifications.push({
        id: `T-${item.id}`,
        type: "Transaction Alert",
        title: "Transaction update",
        message: `${item.livestock_type} transaction between ${item.farmer_name} and ${item.buyer_name} is ${item.status}.`,
        time: item.created_at,
        status: item.status === "Pending" ? "Unread" : "Read",
      });
    });

    const [users] = await db.query(`
      SELECT id, full_name, role, created_at
      FROM users
      WHERE role != 'admin'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    users.forEach((item) => {
      notifications.push({
        id: `U-${item.id}`,
        type: "User Registration",
        title: `New ${item.role} registered`,
        message: `${item.full_name} created a ${item.role} account.`,
        time: item.created_at,
        status: "Read",
      });
    });

    notifications.sort((a, b) => new Date(b.time) - new Date(a.time));

    const totalAlerts = notifications.length;
    const unreadAlerts = notifications.filter((n) => n.status === "Unread").length;
    const verificationRequests = notifications.filter(
      (n) => n.type === "Listing Approval" && n.status === "Unread"
    ).length;
    const resolvedToday = notifications.filter((n) => n.status === "Read").length;

    res.json({
      notifications,
      stats: {
        totalAlerts,
        unreadAlerts,
        verificationRequests,
        resolvedToday,
      },
      categories: {
        listingApprovals: notifications.filter((n) => n.type === "Listing Approval").length,
        documentVerification: verificationRequests,
        transactionAlerts: notifications.filter((n) => n.type === "Transaction Alert").length,
        userReports: notifications.filter((n) => n.type === "User Registration").length,
      },
    });
  } catch (error) {
    console.error("Admin notifications error:", error);
    res.status(500).json({ message: "Server error loading notifications" });
  }
};

module.exports = { getAdminNotifications };