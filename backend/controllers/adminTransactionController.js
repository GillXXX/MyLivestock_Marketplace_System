const db = require("../config/db");

// MAO monitors transactions read-only — it has no power to complete,
// decline, or otherwise act on a deal the buyer/farmer are working out
// themselves.
const getAdminTransactions = async (req, res) => {
  try {
    const [transactions] = await db.query(`
      SELECT
        t.id,
        t.amount,
        t.quantity,
        t.workflow_step,
        t.status,
        t.created_at,
        t.cancel_requested_at,
        t.cancel_reason,
        t.cancel_outcome,
        t.listed_amount,
        t.offer_unit_price,
        t.offer_pickup_date,
        t.offer_pickup_place,
        t.offer_payment,
        t.offer_note,
        t.offer_by,
        t.terms_agreed_at,
        t.actual_weight_kg,
        l.price AS listing_price,
        l.weight AS listing_weight,
        l.livestock_type,
        l.category,
        l.unit,
        l.breed,
        farmer.full_name AS seller_name,
        buyer.full_name AS buyer_name
      FROM transactions t
      JOIN livestock_listings l ON t.listing_id = l.id
      JOIN users farmer ON t.farmer_id = farmer.id
      JOIN users buyer ON t.buyer_id = buyer.id
      ORDER BY t.created_at DESC
    `);

    const [stats] = await db.query(`
      SELECT
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status IN ('Declined', 'Cancelled') THEN 1 ELSE 0 END) AS declinedCancelled,
        COALESCE(SUM(CASE WHEN status = 'Completed' THEN amount ELSE 0 END), 0) AS tradeValue
      FROM transactions
    `);

    res.json({
      transactions,
      stats: {
        completed: stats[0].completed || 0,
        pending: stats[0].pending || 0,
        declinedCancelled: stats[0].declinedCancelled || 0,
        tradeValue: stats[0].tradeValue || 0,
      },
    });
  } catch (error) {
    console.error("Admin transactions error:", error);
    res.status(500).json({ message: "Server error loading transactions" });
  }
};

module.exports = {
  getAdminTransactions,
};
