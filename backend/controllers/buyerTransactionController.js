const db = require("../config/db");

const getBuyerTransactions = async (req, res) => {
  try {
    const buyerId = req.user.id;

    const [transactions] = await db.query(
      `SELECT 
        t.id,
        t.amount,
        t.workflow_step,
        t.status,
        t.created_at,
        l.livestock_type,
        l.breed,
        u.full_name AS farmer_name
      FROM transactions t
      JOIN livestock_listings l ON t.listing_id = l.id
      JOIN users u ON t.farmer_id = u.id
      WHERE t.buyer_id = ?
      ORDER BY t.created_at DESC`,
      [buyerId]
    );

    res.json({ transactions });
  } catch (error) {
    console.error("Buyer transactions error:", error);
    res.status(500).json({ message: "Server error loading buyer transactions" });
  }
};

module.exports = { getBuyerTransactions };