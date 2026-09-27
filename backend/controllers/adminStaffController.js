const db = require("../config/db");
const bcrypt = require("bcryptjs");
const { isStrongPassword, PASSWORD_REQUIREMENTS_MESSAGE } = require("../utils/validators");

const getStaff = async (req, res) => {
  try {
    const [staff] = await db.query(
      `SELECT id, full_name, email, phone, location, is_active, created_at
       FROM users
       WHERE role = 'mao_staff'
       ORDER BY created_at DESC`
    );

    const active = staff.filter((s) => s.is_active).length;

    res.json({
      stats: {
        total: staff.length,
        active,
        inactive: staff.length - active,
      },
      staff,
    });
  } catch (error) {
    console.error("Get staff error:", error);
    res.status(500).json({ message: "Server error loading staff accounts" });
  }
};

// All MAO staff work out of the same municipal office, so the account's
// location is fixed rather than asked for on the creation form.
const MAO_STAFF_LOCATION = "Veruela, Agusan del Sur";

const createStaff = async (req, res) => {
  try {
    const { fullName, email, phone, password, confirmPassword } = req.body;

    if (!fullName || !email || !phone || !password || !confirmPassword) {
      return res.status(400).json({ message: "Please fill in all required fields" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: PASSWORD_REQUIREMENTS_MESSAGE });
    }

    const [existingUser] = await db.query("SELECT id FROM users WHERE email = ?", [email]);

    if (existingUser.length > 0) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO users (full_name, email, phone, location, role, password)
       VALUES (?, ?, ?, ?, 'mao_staff', ?)`,
      [fullName, email, phone, MAO_STAFF_LOCATION, hashedPassword]
    );

    res.status(201).json({ message: "Staff account created successfully" });
  } catch (error) {
    console.error("Create staff error:", error);
    res.status(500).json({ message: "Server error creating staff account" });
  }
};

const setStaffActive = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive must be true or false" });
    }

    const [[staffMember]] = await db.query(
      "SELECT id FROM users WHERE id = ? AND role = 'mao_staff'",
      [req.params.id]
    );

    if (!staffMember) {
      return res.status(404).json({ message: "Staff account not found" });
    }

    await db.query("UPDATE users SET is_active = ? WHERE id = ?", [isActive, staffMember.id]);

    res.json({
      message: isActive ? "Staff account reactivated successfully" : "Staff account deactivated successfully",
    });
  } catch (error) {
    console.error("Set staff active error:", error);
    res.status(500).json({ message: "Server error updating staff account status" });
  }
};

const deleteStaff = async (req, res) => {
  try {
    const [[staffMember]] = await db.query(
      "SELECT id FROM users WHERE id = ? AND role = 'mao_staff'",
      [req.params.id]
    );

    if (!staffMember) {
      return res.status(404).json({ message: "Staff account not found" });
    }

    try {
      await db.query("DELETE FROM users WHERE id = ?", [staffMember.id]);
    } catch (error) {
      if (error.code === "ER_ROW_IS_REFERENCED_2" || error.code === "ER_ROW_IS_REFERENCED") {
        return res.status(409).json({
          message: "Can't delete this account — it has records on file. Deactivate it instead.",
        });
      }
      throw error;
    }

    res.json({ message: "Staff account deleted successfully" });
  } catch (error) {
    console.error("Delete staff error:", error);
    res.status(500).json({ message: "Server error deleting staff account" });
  }
};

module.exports = { getStaff, createStaff, setStaffActive, deleteStaff };
