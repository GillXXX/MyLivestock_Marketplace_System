const db = require("../config/db");

const getAdminListings = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    const [listings] = await db.query(`
      SELECT 
        l.id,
        l.livestock_type,
        l.breed,
        l.price,
        l.location,
        l.status,
        l.created_at,
        u.full_name AS farmer_name
      FROM livestock_listings l
      JOIN users u ON l.farmer_id = u.id
      ORDER BY l.created_at DESC
    `);

    const [stats] = await db.query(`
      SELECT
        COUNT(*) AS totalListings,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pendingReview,
        SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN status = 'Flagged' THEN 1 ELSE 0 END) AS flagged
      FROM livestock_listings
    `);

    res.json({
      listings,
      stats: {
        totalListings: stats[0].totalListings || 0,
        pendingReview: stats[0].pendingReview || 0,
        approved: stats[0].approved || 0,
        flagged: stats[0].flagged || 0,
      },
    });
  } catch (error) {
    console.error("Admin listings error:", error);
    res.status(500).json({ message: "Server error loading listings" });
  }
};

const updateListingStatus = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    const { status } = req.body;

    if (!["Available", "Pending", "Flagged", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid listing status" });
    }

    await db.query("UPDATE livestock_listings SET status = ? WHERE id = ?", [
      status,
      req.params.id,
    ]);

    res.json({ message: "Listing status updated successfully" });
  } catch (error) {
    console.error("Update listing status error:", error);
    res.status(500).json({ message: "Server error updating listing" });
  }
};

const deleteListing = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    await db.query("DELETE FROM livestock_listings WHERE id = ?", [req.params.id]);

    res.json({ message: "Listing deleted successfully" });
  } catch (error) {
    console.error("Delete listing error:", error);
    res.status(500).json({ message: "Server error deleting listing" });
  }
};

module.exports = {
  getAdminListings,
  updateListingStatus,
  deleteListing,
};