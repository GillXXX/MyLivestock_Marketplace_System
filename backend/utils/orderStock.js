const db = require("../config/db");
const { createNotification } = require("./notify");

// A buyer's cancellation request the seller leaves unanswered this long is
// approved automatically, so a buyer is never stuck with an order the
// seller ignores.
const CANCEL_REQUEST_AUTO_APPROVE_HOURS = 48;

// Only the server's own fixed conditions are passed as `onlyIf` — never
// anything from a request.
const ONLY_IF = {
  // Buyer cancelling outright: only before the seller has acted on it.
  stillInquiry: " AND workflow_step = 'Inquiry'",
  // Approving a cancellation request: only one that's still unanswered.
  openCancelRequest: " AND cancel_requested_at IS NOT NULL AND cancel_outcome IS NULL",
};

// Shared by the buyer's cancel, the seller's decline and cancellation
// approvals: closes a still Pending order and puts its reserved stock back
// on the listing as one step. The status check is part of the UPDATE
// itself, so a double-click, or the buyer cancelling while the seller
// declines, can only return the stock once. `set` adds columns to update
// alongside the status. Returns false when the order no longer qualified.
const closeOrderAndReturnStock = async (transaction, newStatus, { set = {}, onlyIf } = {}) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [closeResult] = await connection.query(
      `UPDATE transactions SET ? WHERE id = ? AND status = 'Pending'${onlyIf ? ONLY_IF[onlyIf] : ""}`,
      [{ ...set, status: newStatus }, transaction.id]
    );

    if (closeResult.affectedRows === 0) {
      await connection.rollback();
      return false;
    }

    await connection.query(
      "UPDATE livestock_listings SET quantity = quantity + ?, status = IF(status = 'Sold', 'Available', status) WHERE id = ?",
      [transaction.quantity, transaction.listing_id]
    );

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Approves every cancellation request the seller left unanswered past the
// deadline. Run on a timer by server.js and before transactions are shown,
// so the result is right even if the timer hasn't fired yet.
const autoApproveExpiredCancellations = async () => {
  const [expired] = await db.query(
    `SELECT t.id, t.listing_id, t.quantity, l.livestock_type
     FROM transactions t
     JOIN livestock_listings l ON t.listing_id = l.id
     WHERE t.status = 'Pending'
       AND t.cancel_requested_at IS NOT NULL
       AND t.cancel_outcome IS NULL
       AND t.cancel_requested_at < NOW() - INTERVAL ? HOUR`,
    [CANCEL_REQUEST_AUTO_APPROVE_HOURS]
  );

  for (const transaction of expired) {
    const approved = await closeOrderAndReturnStock(transaction, "Cancelled", {
      set: { cancel_outcome: "Auto-approved", cancel_responded_at: new Date() },
      onlyIf: "openCancelRequest",
    });

    if (approved) {
      await createNotification(
        "Transaction Alert",
        "Cancellation auto-approved",
        `${transaction.livestock_type} order TRX-${String(transaction.id).padStart(3, "0")} was cancelled — the seller didn't respond within ${CANCEL_REQUEST_AUTO_APPROVE_HOURS} hours.`,
        transaction.id
      );
    }
  }
};

module.exports = {
  CANCEL_REQUEST_AUTO_APPROVE_HOURS,
  closeOrderAndReturnStock,
  autoApproveExpiredCancellations,
};
