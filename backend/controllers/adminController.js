const db = require("../config/db");

const getAdminDashboard = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    const [users] = await db.query(
      "SELECT COUNT(*) AS total FROM users WHERE role != 'admin'"
    );

    const [activeListings] = await db.query(
      "SELECT COUNT(*) AS total FROM livestock_listings WHERE status = 'Available'"
    );

    const [pendingVerification] = await db.query(
      "SELECT COUNT(*) AS total FROM livestock_listings WHERE status = 'Pending'"
    );

    const [completedTrades] = await db.query(
      "SELECT COUNT(*) AS total FROM transactions WHERE status = 'Completed'"
    );

    const [verificationQueue] = await db.query(
      `SELECT 
        l.id,
        u.full_name AS farmer_name,
        l.livestock_type,
        l.health_status,
        l.status
      FROM livestock_listings l
      JOIN users u ON l.farmer_id = u.id
      ORDER BY l.created_at DESC
      LIMIT 5`
    );

    const [activity] = await db.query(
      `SELECT 
        l.livestock_type,
        l.breed,
        l.status,
        u.full_name AS farmer_name
      FROM livestock_listings l
      JOIN users u ON l.farmer_id = u.id
      ORDER BY l.created_at DESC
      LIMIT 5`
    );

    const [sellerLocations] = await db.query(
      "SELECT COUNT(*) AS total FROM users WHERE role = 'farmer' AND farm_location IS NOT NULL"
    );

    res.json({
      stats: {
        registeredUsers: users[0].total,
        activeListings: activeListings[0].total,
        pendingVerification: pendingVerification[0].total,
        completedTrades: completedTrades[0].total,
        sellerLocations: sellerLocations[0].total,
      },
      verificationQueue,
      activity,
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({ message: "Server error loading admin dashboard" });
  }
};

module.exports = { getAdminDashboard };