const db = require("../config/db");

const getAdminVerification = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    const [documents] = await db.query(`
      SELECT
        l.id,
        u.full_name AS farmer_name,
        l.livestock_type,
        l.health_status,
        l.status,
        l.created_at
      FROM livestock_listings l
      JOIN users u ON l.farmer_id = u.id
      ORDER BY l.created_at DESC
    `);

    const [stats] = await db.query(`
      SELECT
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN status IN ('Rejected', 'Flagged') THEN 1 ELSE 0 END) AS rejected,
        COUNT(*) AS total
      FROM livestock_listings
    `);

    res.json({
      documents,
      stats: {
        pending: stats[0].pending || 0,
        approved: stats[0].approved || 0,
        rejected: stats[0].rejected || 0,
        total: stats[0].total || 0,
      },
    });
  } catch (error) {
    console.error("Admin verification error:", error);
    res.status(500).json({ message: "Server error loading verification records" });
  }
};

const updateVerificationStatus = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    const { status } = req.body;

    if (!["Available", "Pending", "Flagged", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    await db.query("UPDATE livestock_listings SET status = ? WHERE id = ?", [
      status,
      req.params.id,
    ]);

    res.json({ message: "Verification status updated successfully" });
  } catch (error) {
    console.error("Verification update error:", error);
    res.status(500).json({ message: "Server error updating verification" });
  }
};

module.exports = {
  getAdminVerification,
  updateVerificationStatus,
};