const db = require("../config/db");
const { createNotification } = require("../utils/notify");
const { getSystemSettings } = require("../utils/systemSettings");
const { closeOrderAndReturnStock } = require("../utils/orderStock");

const getBuyerTransactions = async (req, res) => {
  try {
    const buyerId = req.user.id;

    const [transactions] = await db.query(
      `SELECT
        t.id,
        t.amount,
        t.quantity,
        t.workflow_step,
        t.status,
        t.created_at,
        t.updated_at,
        l.livestock_type,
        l.category,
        l.unit,
        l.breed,
        l.location,
        l.image_url,
        u.full_name AS seller_name,
        (
          SELECT c.id FROM conversations c
          WHERE c.listing_id = t.listing_id
            AND c.farmer_id = t.farmer_id
            AND c.buyer_id = t.buyer_id
          LIMIT 1
        ) AS conversation_id
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
        SUM(CASE WHEN status IN ('Declined', 'Cancelled') THEN 1 ELSE 0 END) AS declined,
        COALESCE(SUM(CASE WHEN status = 'Completed' THEN amount ELSE 0 END), 0) AS purchaseValue
      FROM transactions
      WHERE buyer_id = ?`,
      [buyerId]
    );

    const settings = await getSystemSettings();

    res.json({
      transactions,
      stats: {
        totalTransactions: statsRows[0].totalTransactions || 0,
        pendingDeals: statsRows[0].pendingDeals || 0,
        completed: statsRows[0].completed || 0,
        declined: statsRows[0].declined || 0,
        purchaseValue: statsRows[0].purchaseValue || 0,
      },
      // Tells the frontend whether a deal can be confirmed as soon as
      // negotiation/verification is underway (Flexible) or only once it has
      // formally reached the Confirmation stage (Strict, the default).
      workflowMode: settings.transaction_workflow === "Flexible Workflow" ? "Flexible" : "Strict",
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

    // Strict Workflow requires the deal to have formally reached the
    // Confirmation stage before it can be closed. Flexible Workflow trusts
    // the buyer/farmer to close whenever they've agreed, skipping the
    // formal stage-by-stage gate (as long as it isn't still just an Inquiry).
    const settings = await getSystemSettings();
    const isStrict = settings.transaction_workflow !== "Flexible Workflow";

    if (isStrict && transaction.workflow_step !== "Confirmation") {
      return res.status(400).json({ message: "Transaction isn't ready to be confirmed yet" });
    }

    if (!isStrict && transaction.workflow_step === "Inquiry") {
      return res.status(400).json({ message: "Negotiate with the seller before completing this deal" });
    }

    const [completeResult] = await db.query(
      "UPDATE transactions SET workflow_step = 'Completed', status = 'Completed' WHERE id = ? AND status = 'Pending'",
      [id]
    );

    if (completeResult.affectedRows === 0) {
      return res.status(409).json({ message: "This transaction was already updated. Please refresh." });
    }

    // Stock for this order was already reserved off the listing's quantity
    // when it was placed, and other pending orders may legitimately be for
    // separate remaining head — so completing this one shouldn't touch the
    // listing or cancel siblings.

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
      `SELECT t.id, t.buyer_id, t.listing_id, t.quantity, t.status, l.livestock_type, farmer.full_name AS farmer_name
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

    // Return the reserved stock to the listing now that the order fell through.
    if (!(await closeOrderAndReturnStock(transaction, "Cancelled"))) {
      return res.status(409).json({ message: "This transaction was already updated. Please refresh." });
    }

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