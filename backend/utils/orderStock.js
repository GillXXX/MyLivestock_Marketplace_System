const db = require("../config/db");

// Shared by the buyer's cancel and the seller's decline: closes a still
// Pending order and puts its reserved stock back on the listing as one
// step. The status check is part of the UPDATE itself, so a double-click,
// or the buyer cancelling while the seller declines, can only return the
// stock once. Returns false when the order was no longer Pending.
const closeOrderAndReturnStock = async (transaction, newStatus) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [closeResult] = await connection.query(
      "UPDATE transactions SET status = ? WHERE id = ? AND status = 'Pending'",
      [newStatus, transaction.id]
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

module.exports = { closeOrderAndReturnStock };
