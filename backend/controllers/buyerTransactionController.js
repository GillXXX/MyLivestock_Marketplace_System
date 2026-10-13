const db = require("../config/db");
const { createNotification } = require("../utils/notify");
const { getSystemSettings } = require("../utils/systemSettings");
const {
  CANCEL_REQUEST_AUTO_APPROVE_HOURS,
  FREE_CANCEL_HOURS,
  freeCancelCondition,
  closeOrderAndReturnStock,
  autoApproveExpiredCancellations,
} = require("../utils/orderStock");

const CANCEL_REASON_MAX_LENGTH = 255;

const getBuyerTransactions = async (req, res) => {
  try {
    const buyerId = req.user.id;

    await autoApproveExpiredCancellations();

    const [transactions] = await db.query(
      `SELECT
        t.id,
        t.amount,
        t.quantity,
        t.workflow_step,
        t.status,
        t.created_at,
        t.updated_at,
        t.cancel_requested_at,
        t.cancel_reason,
        t.cancel_outcome,
        t.cancel_responded_at,
        ${freeCancelCondition("t.")} AS can_cancel_freely,
        t.created_at + INTERVAL ${FREE_CANCEL_HOURS} HOUR AS free_cancel_until,
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
      cancelAutoApproveHours: CANCEL_REQUEST_AUTO_APPROVE_HOURS,
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
      `SELECT t.id, t.buyer_id, t.listing_id, t.workflow_step, t.status, t.cancel_requested_at, t.cancel_outcome,
              l.livestock_type, farmer.full_name AS farmer_name
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

    if (transaction.cancel_requested_at && !transaction.cancel_outcome) {
      return res.status(400).json({
        message: "You asked to cancel this order. Wait for the seller to respond before completing it.",
      });
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
      `UPDATE transactions SET workflow_step = 'Completed', status = 'Completed'
       WHERE id = ? AND status = 'Pending' AND (cancel_requested_at IS NULL OR cancel_outcome IS NOT NULL)`,
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

// For FREE_CANCEL_HOURS after starting a deal (or on an old order the
// seller never accepted) the buyer cancels outright. After that they can
// only ask, with a reason; the seller approves or rejects, and an
// unanswered request is approved automatically after
// CANCEL_REQUEST_AUTO_APPROVE_HOURS. One request per order — after a
// rejection the two sort it out in chat.
const cancelTransaction = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { id } = req.params;
    const reason = typeof req.body.reason === "string" ? req.body.reason.trim() : "";

    const [rows] = await db.query(
      `SELECT t.id, t.buyer_id, t.listing_id, t.quantity, t.status, t.workflow_step,
              t.cancel_requested_at, t.cancel_outcome, ${freeCancelCondition("t.")} AS can_cancel_freely,
              l.livestock_type, farmer.full_name AS farmer_name, buyer.full_name AS buyer_name
       FROM transactions t
       JOIN livestock_listings l ON t.listing_id = l.id
       JOIN users farmer ON t.farmer_id = farmer.id
       JOIN users buyer ON t.buyer_id = buyer.id
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

    if (transaction.can_cancel_freely) {
      // Return the reserved stock to the listing now that the order fell
      // through. The condition is checked again in the UPDATE — if the
      // window closed or the seller moved it on meanwhile, this has to
      // become a request instead.
      if (!(await closeOrderAndReturnStock(transaction, "Cancelled", { onlyIf: "freeCancel" }))) {
        return res.status(409).json({ message: "This transaction was already updated. Please refresh." });
      }

      await createNotification(
        "Transaction Alert",
        "Offer cancelled",
        `${transaction.livestock_type} offer to ${transaction.farmer_name} was cancelled by the buyer.`,
        id
      );

      return res.json({ message: "Offer cancelled successfully", cancelled: true });
    }

    if (transaction.cancel_requested_at && !transaction.cancel_outcome) {
      return res.status(409).json({ message: "You already asked to cancel this order. Waiting for the seller." });
    }

    if (transaction.cancel_outcome === "Rejected") {
      return res.status(409).json({
        message: "The seller declined your cancellation request. Message the seller to sort it out.",
      });
    }

    if (!reason) {
      return res.status(400).json({ message: "Please give a reason for cancelling" });
    }

    if (reason.length > CANCEL_REASON_MAX_LENGTH) {
      return res.status(400).json({ message: `Reason must be ${CANCEL_REASON_MAX_LENGTH} characters or fewer` });
    }

    const [requestResult] = await db.query(
      `UPDATE transactions SET cancel_requested_at = NOW(), cancel_reason = ?
       WHERE id = ? AND status = 'Pending' AND NOT ${freeCancelCondition()} AND cancel_requested_at IS NULL`,
      [reason, id]
    );

    if (requestResult.affectedRows === 0) {
      return res.status(409).json({ message: "This transaction was already updated. Please refresh." });
    }

    await createNotification(
      "Transaction Alert",
      "Cancellation requested",
      `${transaction.buyer_name} asked ${transaction.farmer_name} to cancel the ${transaction.livestock_type} order: "${reason}"`,
      id
    );

    res.json({
      message: `Cancellation requested. The seller has ${CANCEL_REQUEST_AUTO_APPROVE_HOURS} hours to respond, or it will be approved automatically.`,
      requested: true,
    });
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