const db = require("../config/db");

const getFarmerDashboard = async (req, res) => {
  try {
    const farmerId = req.user.id;

    const [userRows] = await db.query(
  "SELECT full_name, farm_location, location, role FROM users WHERE id = ?",
  [farmerId]
);

    const user = userRows[0];

    const [activeListings] = await db.query(
      "SELECT COUNT(*) AS total FROM livestock_listings WHERE farmer_id = ? AND status != 'Sold'",
      [farmerId]
    );

    const [buyerInquiries] = await db.query(
      `SELECT COUNT(*) AS total 
       FROM inquiries i
       JOIN livestock_listings l ON i.listing_id = l.id
       WHERE l.farmer_id = ?`,
      [farmerId]
    );

    const [completedSales] = await db.query(
      "SELECT COUNT(*) AS total FROM transactions WHERE farmer_id = ? AND status = 'Completed'",
      [farmerId]
    );

    const [tradeValue] = await db.query(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE farmer_id = ? AND status = 'Completed'",
      [farmerId]
    );

    const [listings] = await db.query(
      `SELECT id, livestock_type, breed, price, status 
       FROM livestock_listings 
       WHERE farmer_id = ? 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [farmerId]
    );

    const [activities] = await db.query(
      `SELECT 
        i.created_at,
        'New inquiry received' AS title,
        CONCAT('Buyer asked about your ', l.livestock_type, ' listing.') AS text
       FROM inquiries i
       JOIN livestock_listings l ON i.listing_id = l.id
       WHERE l.farmer_id = ?
       ORDER BY i.created_at DESC
       LIMIT 5`,
      [farmerId]
    );

    const [workflows] = await db.query(
      `SELECT 
        l.livestock_type,
        u.full_name AS buyer_name,
        t.workflow_step
       FROM transactions t
       JOIN livestock_listings l ON t.listing_id = l.id
       JOIN users u ON t.buyer_id = u.id
       WHERE t.farmer_id = ?
       ORDER BY t.created_at DESC
       LIMIT 5`,
      [farmerId]
    );

    res.json({
      user,
      stats: {
        activeListings: activeListings[0].total,
        buyerInquiries: buyerInquiries[0].total,
        completedSales: completedSales[0].total,
        tradeValue: tradeValue[0].total,
      },
      listings,
      activities,
      workflows,
    });
  } catch (error) {
    console.error("Farmer dashboard error:", error);
    res.status(500).json({ message: "Server error loading farmer dashboard" });
  }
};

module.exports = { getFarmerDashboard };