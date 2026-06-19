// controllers/buyerProfileController.js
const db = require("../config/db");

const getBuyerProfile = async (req, res) => {
  try {
    const buyerId = req.user.id;

    const [userRows] = await db.query(
      "SELECT id, full_name, email, phone, location, role, created_at FROM users WHERE id = ?",
      [buyerId]
    );

    const [statsRows] = await db.query(
      `SELECT
        (SELECT COUNT(*) FROM inquiries WHERE buyer_id = ?) AS activeInquiries,
        (SELECT COUNT(*) FROM transactions WHERE buyer_id = ? AND status = 'Completed') AS completedPurchases,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE buyer_id = ? AND status = 'Completed') AS purchaseValue`,
      [buyerId, buyerId, buyerId]
    );

    res.json({
      user: userRows[0],
      stats: statsRows[0],
    });
  } catch (error) {
    res.status(500).json({ message: "Server error loading buyer profile" });
  }
};

module.exports = { getBuyerProfile };