const db = require("../config/db");
const { createNotification } = require("../utils/notify");

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
        l.location,
        u.full_name AS seller_name
      FROM transactions t
      JOIN livestock_listings l ON t.listing_id = l.id
      JOIN users u ON t.farmer_id = u.id
      WHERE t.buyer_id = ?
      ORDER BY t.created_at DESC`,
      [buyerId]
    );

    const [statsRows] = await db.query(
      `SELECT
        COUNT(*) AS totalTransactions,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pendingDeals,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed,
        COALESCE(SUM(CASE WHEN status = 'Completed' THEN amount ELSE 0 END), 0) AS purchaseValue
      FROM transactions
      WHERE buyer_id = ?`,
      [buyerId]
    );

    res.json({
      transactions,
      stats: {
        totalTransactions: statsRows[0].totalTransactions || 0,
        pendingDeals: statsRows[0].pendingDeals || 0,
        completed: statsRows[0].completed || 0,
        purchaseValue: statsRows[0].purchaseValue || 0,
      },
    });
  } catch (error) {
    console.error("Buyer transactions error:", error);
    res.status(500).json({
      message: "Server error loading buyer transactions",
    });
  }
};

const confirmTransaction = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT t.id, t.buyer_id, t.listing_id, t.workflow_step, t.status, l.livestock_type, farmer.full_name AS farmer_name
       FROM transactions t
       JOIN livestock_listings l ON t.listing_id = l.id
       JOIN users farmer ON t.farmer_id = farmer.id
       WHERE t.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const transaction = rows[0];

    if (transaction.buyer_id !== buyerId) {
      return res.status(403).json({ message: "Not authorized for this transaction" });
    }

    if (transaction.status !== "Pending") {
      return res.status(400).json({ message: `This transaction is already ${transaction.status.toLowerCase()}` });
    }

    if (transaction.workflow_step !== "Confirmation") {
      return res.status(400).json({ message: "Transaction isn't ready to be confirmed yet" });
    }

    await db.query(
      "UPDATE transactions SET workflow_step = 'Completed', status = 'Completed' WHERE id = ?",
      [id]
    );

    await db.query(
      "UPDATE livestock_listings SET status = 'Sold' WHERE id = ?",
      [transaction.listing_id]
    );

    await db.query(
      "UPDATE transactions SET status = 'Declined' WHERE listing_id = ? AND id != ? AND status = 'Pending'",
      [transaction.listing_id, id]
    );

    await createNotification(
      "Transaction Alert",
      "Transaction completed",
      `${transaction.livestock_type} deal with ${transaction.farmer_name} was confirmed and completed by the buyer.`,
      id
    );

    res.json({ message: "Transaction completed successfully" });
  } catch (error) {
    console.error("Confirm transaction error:", error);
    res.status(500).json({ message: "Server error confirming transaction" });
  }
};

const cancelTransaction = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT t.id, t.buyer_id, t.status, l.livestock_type, farmer.full_name AS farmer_name
       FROM transactions t
       JOIN livestock_listings l ON t.listing_id = l.id
       JOIN users farmer ON t.farmer_id = farmer.id
       WHERE t.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const transaction = rows[0];

    if (transaction.buyer_id !== buyerId) {
      return res.status(403).json({ message: "Not authorized for this transaction" });
    }

    if (transaction.status !== "Pending") {
      return res.status(400).json({ message: `This transaction is already ${transaction.status.toLowerCase()}` });
    }

    await db.query("UPDATE transactions SET status = 'Cancelled' WHERE id = ?", [id]);

    await createNotification(
      "Transaction Alert",
      "Offer cancelled",
      `${transaction.livestock_type} offer to ${transaction.farmer_name} was cancelled by the buyer.`,
      id
    );

    res.json({ message: "Offer cancelled successfully" });
  } catch (error) {
    console.error("Cancel transaction error:", error);
    res.status(500).json({ message: "Server error cancelling transaction" });
  }
};

module.exports = {
  getBuyerTransactions,
  confirmTransaction,
  cancelTransaction,
};