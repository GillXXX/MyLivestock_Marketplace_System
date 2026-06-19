const db = require("../config/db");

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
        u.created_at,
        COUNT(l.id) AS listings
      FROM users u
      LEFT JOIN livestock_listings l ON u.id = l.farmer_id
      WHERE u.role != 'admin'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    const farmers = users.filter((u) => u.role === "farmer").length;
    const buyers = users.filter((u) => u.role === "buyer").length;

    res.json({
      stats: {
        farmers,
        buyers,
        pendingVerification: 0,
        verifiedRate: users.length > 0 ? "100%" : "0%",
      },
      users,
      verificationQueue: users.filter((u) => u.role === "farmer"),
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

    await db.query("DELETE FROM users WHERE id = ? AND role != 'admin'", [
      req.params.id,
    ]);

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Server error deleting user" });
  }
};

module.exports = { getAdminUsers, deleteUser };