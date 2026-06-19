const db = require("../config/db");

const getMyListings = async (req, res) => {
  try {
    const farmerId = req.user.id;

    const [listings] = await db.query(
      "SELECT * FROM livestock_listings WHERE farmer_id = ? ORDER BY created_at DESC",
      [farmerId]
    );

    const [stats] = await db.query(
      `SELECT 
        COUNT(*) AS activeListings,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pendingReview,
        COALESCE(SUM(price), 0) AS estimatedValue
      FROM livestock_listings 
      WHERE farmer_id = ?`,
      [farmerId]
    );

    res.json({
      listings,
      stats: {
        activeListings: stats[0].activeListings,
        pendingReview: stats[0].pendingReview,
        marketplaceViews: 0,
        estimatedValue: stats[0].estimatedValue,
      },
    });
  } catch (error) {
    console.error("Get listings error:", error);
    res.status(500).json({ message: "Server error loading listings" });
  }
};

const createListing = async (req, res) => {
  try {
    const farmerId = req.user.id;

    const {
      livestockType,
      breed,
      age,
      weight,
      price,
      healthStatus,
      location,
      description,
      imageUrl,
    } = req.body;

    if (!livestockType || !breed || !age || !weight || !price || !healthStatus || !location) {
      return res.status(400).json({ message: "Please fill in all required fields" });
    }

    await db.query(
      `INSERT INTO livestock_listings
      (farmer_id, livestock_type, breed, age, weight, price, health_status, location, description, image_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        farmerId,
        livestockType,
        breed,
        age,
        weight,
        price,
        healthStatus,
        location,
        description,
        imageUrl || null,
        "Available",
      ]
    );

    res.status(201).json({ message: "Listing created successfully" });
  } catch (error) {
    console.error("Create listing error:", error);
    res.status(500).json({ message: "Server error creating listing" });
  }
};

module.exports = { getMyListings, createListing };