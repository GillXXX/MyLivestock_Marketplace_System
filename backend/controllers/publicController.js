const db = require("../config/db");

const getPublicStats = async (req, res) => {
  try {
    const [[{ total }]] = await db.query(
      "SELECT COUNT(*) AS total FROM livestock_listings WHERE status = 'Available'"
    );

    res.json({ activeListings: total });
  } catch (error) {
    console.error("Public stats error:", error);
    res.status(500).json({ message: "Server error loading marketplace stats" });
  }
};

module.exports = { getPublicStats };
