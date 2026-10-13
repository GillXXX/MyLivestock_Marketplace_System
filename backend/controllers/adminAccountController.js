const db = require("../config/db");
const bcrypt = require("bcryptjs");
const { isStrongPassword, PASSWORD_REQUIREMENTS_MESSAGE } = require("../utils/validators");

// The admin changing their own password. (MAO staff can't — their passwords
// are set and reset by the admin in Staff Management.)
const changeOwnPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "Please fill in all password fields" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New passwords do not match" });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ message: PASSWORD_REQUIREMENTS_MESSAGE });
    }

    if (newPassword === currentPassword) {
      return res.status(400).json({ message: "Choose a new password that's different from the current one" });
    }

    const [[account]] = await db.query("SELECT password FROM users WHERE id = ?", [req.user.id]);

    if (!account) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = account.password ? await bcrypt.compare(currentPassword, account.password) : false;

    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query(
      "UPDATE users SET password = ? WHERE id = ?",
      [hashedPassword, req.user.id]
    );

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Change own password error:", error);
    res.status(500).json({ message: "Server error updating password" });
  }
};

module.exports = { changeOwnPassword };
