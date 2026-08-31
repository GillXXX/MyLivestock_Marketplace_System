const db = require("../config/db");
const { createNotification } = require("../utils/notify");

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
        SUM(CASE WHEN status IN ('Declined', 'Cancelled') THEN 1 ELSE 0 END) AS declinedCancelled,
        COALESCE(SUM(CASE WHEN status = 'Completed' THEN amount ELSE 0 END), 0) AS tradeValue
      FROM transactions
    `);

    res.json({
      transactions,
      stats: {
        completed: stats[0].completed || 0,
        pending: stats[0].pending || 0,
        flagged: stats[0].flagged || 0,
        declinedCancelled: stats[0].declinedCancelled || 0,
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
    const { id } = req.params;

    if (!["Pending", "Completed", "Flagged", "Declined", "Cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid transaction status" });
    }

    const [[trx]] = await db.query(
      `SELECT t.id, t.listing_id, t.status AS currentStatus, l.livestock_type,
        farmer.full_name AS farmer_name, buyer.full_name AS buyer_name
       FROM transactions t
       JOIN livestock_listings l ON t.listing_id = l.id
       JOIN users farmer ON t.farmer_id = farmer.id
       JOIN users buyer ON t.buyer_id = buyer.id
       WHERE t.id = ?`,
      [id]
    );

    if (!trx) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (status === "Completed") {
      // Mirror the buyer-confirm flow: force-completing a transaction must
      // sell the listing and close out every other pending offer on it,
      // otherwise the listing stays "Available" while a deal on it is done.
      await db.query(
        "UPDATE transactions SET status = 'Completed', workflow_step = 'Completed' WHERE id = ?",
        [id]
      );
      await db.query("UPDATE livestock_listings SET status = 'Sold' WHERE id = ?", [trx.listing_id]);
      await db.query(
        "UPDATE transactions SET status = 'Declined' WHERE listing_id = ? AND id != ? AND status = 'Pending'",
        [trx.listing_id, id]
      );
    } else {
      await db.query("UPDATE transactions SET status = ? WHERE id = ?", [status, id]);

      if (trx.currentStatus === "Completed") {
        // Reverting a completed sale — reopen the listing unless another
        // transaction on it is also marked Completed.
        const [[stillSold]] = await db.query(
          "SELECT COUNT(*) AS c FROM transactions WHERE listing_id = ? AND status = 'Completed' AND id != ?",
          [trx.listing_id, id]
        );

        if (stillSold.c === 0) {
          await db.query("UPDATE livestock_listings SET status = 'Available' WHERE id = ?", [trx.listing_id]);
        }
      }
    }

    await createNotification(
      "Transaction Alert",
      "Transaction update",
      `${trx.livestock_type} transaction between ${trx.farmer_name} and ${trx.buyer_name} is ${status}.`,
      id
    );

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