const db = require("../config/db");

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
      LIMIT 6`
    );

    const [availableCount] = await db.query(
      "SELECT COUNT(*) AS total FROM livestock_listings WHERE status = 'Available'"
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
        savedListings: 0,
        activeInquiries: activeInquiries[0].total,
        completedPurchases: completedPurchases[0].total,
        nearbySellers: availableCount[0].total,
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

module.exports = { getBuyerDashboard };