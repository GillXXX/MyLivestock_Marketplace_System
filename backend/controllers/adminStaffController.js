const db = require("../config/db");
const bcrypt = require("bcryptjs");
const { isStrongPassword, PASSWORD_REQUIREMENTS_MESSAGE } = require("../utils/validators");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Shared by create and edit: trimmed name/phone, a valid lower-case email
// that no other account uses. Returns { error, status } or the clean values.
const validateStaffDetails = async ({ fullName, email, phone }, excludeId = null) => {
  const cleanName = typeof fullName === "string" ? fullName.trim() : "";
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const cleanPhone = typeof phone === "string" ? phone.trim() : "";

  if (!cleanName || !cleanEmail || !cleanPhone) {
    return { status: 400, error: "Please fill in all required fields" };
  }

  if (!EMAIL_RE.test(cleanEmail)) {
    return { status: 400, error: "Please enter a valid email address" };
  }

  const [existingUser] = await db.query(
    "SELECT id FROM users WHERE email = ? AND id <> ?",
    [cleanEmail, excludeId || 0]
  );

  if (existingUser.length > 0) {
    return { status: 409, error: "Email already registered" };
  }

  return { fullName: cleanName, email: cleanEmail, phone: cleanPhone };
};

const getStaff = async (req, res) => {
  try {
    // Each staff member's latest sign-in and whether it was signed out.
    const [staff] = await db.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.location, u.is_active, u.created_at,
              u.last_login_at,
              s.logged_out_at AS last_logout_at
       FROM users u
       LEFT JOIN staff_sessions s ON s.id = (
         SELECT s2.id FROM staff_sessions s2 WHERE s2.user_id = u.id ORDER BY s2.logged_in_at DESC, s2.id DESC LIMIT 1
       )
       WHERE u.role = 'mao_staff'
       ORDER BY u.created_at DESC`
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

// One staff member's sign-in history, newest first.
const getStaffSessions = async (req, res) => {
  try {
    const [[staffMember]] = await db.query(
      "SELECT id, full_name FROM users WHERE id = ? AND role = 'mao_staff'",
      [req.params.id]
    );

    if (!staffMember) {
      return res.status(404).json({ message: "Staff account not found" });
    }

    const [sessions] = await db.query(
      `SELECT id, login_method, logged_in_at, logged_out_at, ip_address, user_agent
       FROM staff_sessions
       WHERE user_id = ?
       ORDER BY logged_in_at DESC, id DESC
       LIMIT 100`,
      [staffMember.id]
    );

    res.json({ staff: staffMember, sessions });
  } catch (error) {
    console.error("Get staff sessions error:", error);
    res.status(500).json({ message: "Server error loading login history" });
  }
};

// All MAO staff work out of the same municipal office, so the account's
// location is fixed rather than asked for on the creation form.
const MAO_STAFF_LOCATION = "Veruela, Agusan del Sur";

const createStaff = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return res.status(400).json({ message: "Please fill in all required fields" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: PASSWORD_REQUIREMENTS_MESSAGE });
    }

    const details = await validateStaffDetails(req.body);

    if (details.error) {
      return res.status(details.status).json({ message: details.error });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Staff never change their own password — the admin sets it here and
    // resets it later if needed (resetStaffPassword).
    await db.query(
      `INSERT INTO users (full_name, email, phone, location, role, password)
       VALUES (?, ?, ?, ?, 'mao_staff', ?)`,
      [details.fullName, details.email, details.phone, MAO_STAFF_LOCATION, hashedPassword]
    );

    res.status(201).json({ message: "Staff account created successfully" });
  } catch (error) {
    console.error("Create staff error:", error);
    res.status(500).json({ message: "Server error creating staff account" });
  }
};

// Fix a staff member's name, email or phone without recreating the account.
const updateStaff = async (req, res) => {
  try {
    const [[staffMember]] = await db.query(
      "SELECT id FROM users WHERE id = ? AND role = 'mao_staff'",
      [req.params.id]
    );

    if (!staffMember) {
      return res.status(404).json({ message: "Staff account not found" });
    }

    const details = await validateStaffDetails(req.body, staffMember.id);

    if (details.error) {
      return res.status(details.status).json({ message: details.error });
    }

    await db.query(
      "UPDATE users SET full_name = ?, email = ?, phone = ? WHERE id = ?",
      [details.fullName, details.email, details.phone, staffMember.id]
    );

    res.json({ message: "Staff account updated successfully" });
  } catch (error) {
    console.error("Update staff error:", error);
    res.status(500).json({ message: "Server error updating staff account" });
  }
};

// The only way a staff password changes: the admin sets a new one (staff
// can't change their own, and "Forgot password" doesn't apply to them).
// Every current session of that staff member is signed out.
const resetStaffPassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return res.status(400).json({ message: "Please enter the new password twice" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: PASSWORD_REQUIREMENTS_MESSAGE });
    }

    const [[staffMember]] = await db.query(
      "SELECT id FROM users WHERE id = ? AND role = 'mao_staff'",
      [req.params.id]
    );

    if (!staffMember) {
      return res.status(404).json({ message: "Staff account not found" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      `UPDATE users
       SET password = ?, reset_token_hash = NULL, reset_token_expires = NULL
       WHERE id = ?`,
      [hashedPassword, staffMember.id]
    );

    await db.query(
      "UPDATE staff_sessions SET logged_out_at = NOW() WHERE user_id = ? AND logged_out_at IS NULL",
      [staffMember.id]
    );

    res.json({
      message: "Password reset and the staff member was signed out. Give them the new password.",
    });
  } catch (error) {
    console.error("Reset staff password error:", error);
    res.status(500).json({ message: "Server error resetting the password" });
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
          message:
            "Can't delete this account — it has sign-ins, listing reviews or other records on file. Deactivate it instead to keep its history.",
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

module.exports = {
  getStaff,
  getStaffSessions,
  createStaff,
  updateStaff,
  resetStaffPassword,
  setStaffActive,
  deleteStaff,
};
