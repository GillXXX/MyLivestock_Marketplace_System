const db = require("../config/db");

const getAdminTransactions = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    const [transactions] = await db.query(`
      SELECT
        t.id,
        t.amount,
        t.workflow_step,
        t.status,
        t.created_at,
        l.livestock_type,
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
        SUM(CASE WHEN status = 'Flagged' THEN 1 ELSE 0 END) AS flagged,
        COALESCE(SUM(CASE WHEN status = 'Completed' THEN amount ELSE 0 END), 0) AS tradeValue
      FROM transactions
    `);

    res.json({
      transactions,
      stats: {
        completed: stats[0].completed || 0,
        pending: stats[0].pending || 0,
        flagged: stats[0].flagged || 0,
        tradeValue: stats[0].tradeValue || 0,
      },
    });
  } catch (error) {
    console.error("Admin transactions error:", error);
    res.status(500).json({ message: "Server error loading transactions" });
  }
};

const updateTransactionStatus = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    const { status } = req.body;

    if (!["Pending", "Completed", "Flagged"].includes(status)) {
      return res.status(400).json({ message: "Invalid transaction status" });
    }

    await db.query("UPDATE transactions SET status = ? WHERE id = ?", [
      status,
      req.params.id,
    ]);

    res.json({ message: "Transaction status updated successfully" });
  } catch (error) {
    console.error("Update transaction error:", error);
    res.status(500).json({ message: "Server error updating transaction" });
  }
};

module.exports = {
  getAdminTransactions,
  updateTransactionStatus,
};