// controllers/buyerProfileController.js
const db = require("../config/db");
const { getFileUrl } = require("../middleware/uploadMiddleware");

const getBuyerProfile = async (req, res) => {
  try {
    const buyerId = req.user.id;

    const [userRows] = await db.query(
      "SELECT id, full_name, email, phone, location, about, profile_image, role, created_at FROM users WHERE id = ?",
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

const updateBuyerProfile = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { full_name, phone, location, about } = req.body;

    let profileImage = null;

    if (req.file) {
      profileImage = getFileUrl(req.file, req);
    }

    if (profileImage) {
      await db.query(
        "UPDATE users SET full_name = ?, phone = ?, location = ?, about = ?, profile_image = ? WHERE id = ?",
        [full_name, phone, location, about, profileImage, buyerId]
      );
    } else {
      await db.query(
        "UPDATE users SET full_name = ?, phone = ?, location = ?, about = ? WHERE id = ?",
        [full_name, phone, location, about, buyerId]
      );
    }

    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error updating buyer profile" });
  }
};

module.exports = { getBuyerProfile, updateBuyerProfile };