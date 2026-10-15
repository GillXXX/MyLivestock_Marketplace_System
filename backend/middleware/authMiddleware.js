const jwt = require("jsonwebtoken");
const db = require("../config/db");

// Verifying the JWT signature alone only proves the token was issued by us —
// it says nothing about whether the account is still active or even still
// exists. Without this DB check, an admin deactivating or deleting a user
// would only block *future* logins; any token issued before that action
// would keep working for up to 7 days (see issueSession in
// authController.js) since nothing else re-validates it.
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided", code: "SESSION_INVALID" });
  }

  const token = authHeader.split(" ")[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: "Your session has expired. Please sign in again.", code: "SESSION_INVALID" });
  }

  try {
    const [[user]] = await db.query(
      "SELECT role, is_active FROM users WHERE id = ?",
      [decoded.id]
    );

    if (!user) {
      return res.status(401).json({ message: "Account no longer exists", code: "SESSION_INVALID" });
    }

    if (!user.is_active) {
      return res.status(403).json({
        message: "Your account has been deactivated. Contact the MAO administrator.",
        code: "ACCOUNT_DEACTIVATED",
      });
    }

    // Admin / MAO staff tokens carry a recorded session (sid); once that
    // session is signed out, the token stops working even though it hasn't
    // expired.
    if (decoded.sid) {
      const [[session]] = await db.query(
        "SELECT logged_out_at FROM staff_sessions WHERE id = ? AND user_id = ?",
        [decoded.sid, decoded.id]
      );

      if (!session || session.logged_out_at) {
        return res.status(401).json({ message: "You've been signed out. Please sign in again.", code: "SESSION_INVALID" });
      }
    }

    // Same staleness problem as is_active above: trusting decoded.role would
    // let a demoted admin/staff account keep using its old token's elevated
    // role for up to 7 days. Always use the DB's current role instead.
    req.user = { ...decoded, role: user.role };
  } catch (error) {
    console.error("Auth active-check error:", error);
    return res.status(500).json({ message: "Server error verifying session" });
  }

  next();
};

module.exports = protect;