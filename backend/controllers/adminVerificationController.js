const db = require("../config/db");
const { setListingReviewStatus } = require("./adminListingController");

const getAdminVerification = async (req, res) => {
  try {
    const [documents] = await db.query(`
      SELECT
        l.id,
        u.full_name AS farmer_name,
        l.livestock_type,
        l.category,
        l.unit,
        l.health_status,
        l.status,
        l.documents,
        l.created_at,
        u.id AS farmer_id,
        u.email AS farmer_email,
        u.phone AS farmer_phone,
        u.location AS farmer_location,
        u.farm_location AS farmer_farm_location,
        u.is_verified AS farmer_is_verified,
        u.profile_image AS farmer_profile_image,
        u.created_at AS farmer_joined_at
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
    const { status } = req.body;

    const error = await setListingReviewStatus(req.params.id, status);

    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

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