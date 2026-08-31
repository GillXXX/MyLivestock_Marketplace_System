const db = require("../config/db");
const { createNotification } = require("../utils/notify");

const getAdminUsers = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    const [users] = await db.query(`
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.location,
        u.farm_location,
        u.role,
        u.is_verified,
        u.is_active,
        u.verification_document,
        u.verification_status,
        u.verification_note,
        u.verification_submitted_at,
        u.created_at,
        COUNT(l.id) AS listings
      FROM users u
      LEFT JOIN livestock_listings l ON u.id = l.farmer_id
      WHERE u.role != 'admin'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    const farmers = users.filter((u) => u.role === "farmer");
    const buyers = users.filter((u) => u.role === "buyer");
    const verifiedFarmers = farmers.filter((u) => u.is_verified).length;

    res.json({
      stats: {
        farmers: farmers.length,
        buyers: buyers.length,
        pendingVerification: farmers.length - verifiedFarmers,
        verifiedRate:
          farmers.length > 0
            ? `${Math.round((verifiedFarmers / farmers.length) * 100)}%`
            : "0%",
      },
      users,
      verificationQueue: farmers.filter((u) => u.verification_status === "Pending"),
    });
  } catch (error) {
    console.error("Admin users error:", error);
    res.status(500).json({ message: "Server error loading users" });
  }
};

const deleteUser = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    const [[user]] = await db.query(
      "SELECT id FROM users WHERE id = ? AND role != 'admin'",
      [req.params.id]
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    try {
      await db.query("DELETE FROM users WHERE id = ?", [user.id]);
    } catch (error) {
      if (error.code === "ER_ROW_IS_REFERENCED_2" || error.code === "ER_ROW_IS_REFERENCED") {
        return res.status(409).json({
          message:
            "Can't delete this account — it has listings, transactions, or messages on record. Deactivate it instead.",
        });
      }
      throw error;
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Server error deleting user" });
  }
};

const verifyUser = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    const [[user]] = await db.query(
      "SELECT id FROM users WHERE id = ? AND role = 'farmer'",
      [req.params.id]
    );

    if (!user) {
      return res.status(404).json({ message: "Farmer not found" });
    }

    await db.query(
      "UPDATE users SET is_verified = 1, verification_status = 'Approved', verification_note = NULL WHERE id = ?",
      [user.id]
    );

    res.json({ message: "Farmer verified successfully" });
  } catch (error) {
    console.error("Verify user error:", error);
    res.status(500).json({ message: "Server error verifying user" });
  }
};

const rejectVerification = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    const { reason } = req.body;

    const [[user]] = await db.query(
      "SELECT id, full_name FROM users WHERE id = ? AND role = 'farmer'",
      [req.params.id]
    );

    if (!user) {
      return res.status(404).json({ message: "Farmer not found" });
    }

    await db.query(
      "UPDATE users SET is_verified = 0, verification_status = 'Rejected', verification_note = ? WHERE id = ?",
      [reason || null, user.id]
    );

    await createNotification(
      "Verification Request",
      "Farmer verification rejected",
      `${user.full_name}'s verification submission was rejected${reason ? `: ${reason}` : "."}`,
      user.id
    );

    res.json({ message: "Verification rejected" });
  } catch (error) {
    console.error("Reject verification error:", error);
    res.status(500).json({ message: "Server error rejecting verification" });
  }
};

const setUserActive = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive must be true or false" });
    }

    const [[user]] = await db.query(
      "SELECT id FROM users WHERE id = ? AND role != 'admin'",
      [req.params.id]
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await db.query("UPDATE users SET is_active = ? WHERE id = ?", [isActive, user.id]);

    res.json({
      message: isActive ? "Account reactivated successfully" : "Account deactivated successfully",
    });
  } catch (error) {
    console.error("Set user active error:", error);
    res.status(500).json({ message: "Server error updating account status" });
  }
};

module.exports = { getAdminUsers, deleteUser, verifyUser, rejectVerification, setUserActive };