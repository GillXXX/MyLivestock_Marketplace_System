const db = require("../config/db");

const getAdminMapData = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    const [locations] = await db.query(`
      SELECT 
        u.id,
        u.full_name AS farmer,
        u.farm_location AS address,
        u.location,
        u.farm_lat,
        u.farm_lng,
        COUNT(l.id) AS listings,
        GROUP_CONCAT(DISTINCT l.livestock_type) AS livestock_types,
        MAX(l.status) AS status
      FROM users u
      LEFT JOIN livestock_listings l ON u.id = l.farmer_id
      WHERE u.role = 'farmer'
      GROUP BY u.id
      ORDER BY listings DESC
    `);

    const [mappedListings] = await db.query(`
      SELECT COUNT(*) AS total 
      FROM livestock_listings
    `);

    const [sellerLocations] = await db.query(`
      SELECT COUNT(*) AS total
      FROM users
      WHERE role = 'farmer'
    `);

    const [pinnedLocations] = await db.query(`
      SELECT COUNT(*) AS total
      FROM users
      WHERE role = 'farmer' AND farm_lat IS NOT NULL AND farm_lng IS NOT NULL
    `);

    const [livestockTypes] = await db.query(`
      SELECT COUNT(DISTINCT livestock_type) AS total 
      FROM livestock_listings
    `);

    const [distribution] = await db.query(`
      SELECT livestock_type, COUNT(*) AS total
      FROM livestock_listings
      GROUP BY livestock_type
    `);

    const [pendingReview] = await db.query(`
      SELECT COUNT(*) AS total 
      FROM livestock_listings 
      WHERE status = 'Pending'
    `);

    res.json({
      stats: {
        sellerLocations: sellerLocations[0].total,
        pinnedLocations: pinnedLocations[0].total,
        mappedListings: mappedListings[0].total,
        livestockTypes: livestockTypes[0].total,
        withinVeruela: "100%",
        pendingReview: pendingReview[0].total,
      },
      locations,
      distribution,
    });
  } catch (error) {
    console.error("Admin map error:", error);
    res.status(500).json({ message: "Server error loading map data" });
  }
};

module.exports = { getAdminMapData };