const db = require("../config/db");

const getMarketplaceListings = async (req, res) => {
  try {
    const [listings] = await db.query(
      `SELECT 
        l.id,
        l.livestock_type,
        l.breed,
        l.age,
        l.weight,
        l.price,
        l.health_status,
        l.location,
        l.description,
        l.image_url,
        l.status,
        l.created_at,
        u.full_name AS seller_name
      FROM livestock_listings l
      JOIN users u ON l.farmer_id = u.id
      WHERE l.status = 'Available'
      ORDER BY l.created_at DESC`
    );

    res.json({ listings });
  } catch (error) {
    console.error("Marketplace listings error:", error);
    res.status(500).json({ message: "Server error loading marketplace" });
  }
};

module.exports = { getMarketplaceListings };