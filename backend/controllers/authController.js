const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { createNotification } = require("../utils/notify");
const { sendPasswordResetEmail, sendRegistrationCodeEmail } = require("../utils/mailer");
const { isStrongPassword, PASSWORD_REQUIREMENTS_MESSAGE } = require("../utils/validators");

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_OTP_ATTEMPTS = 5;

const generateOtp = () => crypto.randomInt(0, 1000000).toString().padStart(6, "0");
const hashOtp = (code) => crypto.createHash("sha256").update(String(code)).digest("hex");

const issueSession = (res, user) => {
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.status(200).json({
    message: "Login successful",
    token,
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      profileCompleted: !!user.profile_completed,
    },
  });
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Shared by manual registration and a brand-new Google sign-up: both need
// the same "email a 6-digit code" step before anything is created in
// `users`. Re-requesting a code for the same email (typo, resend, a second
// Google attempt, etc.) just replaces the still-pending attempt and clears
// any prior verification.
const issueRegistrationCode = async (email) => {
  const otp = generateOtp();
  const otpExpires = new Date(Date.now() + OTP_TTL_MS);

  await db.query(
    `INSERT INTO registration_codes (email, otp_hash, otp_expires_at, otp_attempts, verified)
     VALUES (?, ?, ?, 0, 0)
     ON DUPLICATE KEY UPDATE
      otp_hash = VALUES(otp_hash),
      otp_expires_at = VALUES(otp_expires_at),
      otp_attempts = 0,
      verified = 0,
      created_at = CURRENT_TIMESTAMP`,
    [email, hashOtp(otp), otpExpires]
  );

  await sendRegistrationCodeEmail(email, otp);
};

// Registration order: email -> verify the emailed code -> only then choose
// a name/phone/password (sign-in stays email + password — see login
// below). This step just confirms the email is real and not already
// taken; nothing is created in `users` yet.
const requestRegistrationCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    const [existingUser] = await db.query("SELECT id FROM users WHERE email = ?", [email]);

    if (existingUser.length > 0) {
      return res.status(409).json({ message: "Email already registered. Please sign in instead." });
    }

    try {
      await issueRegistrationCode(email);
    } catch (emailError) {
      console.error("Failed to send registration code email:", emailError);
      return res.status(500).json({ message: "Could not send the verification code. Please try again." });
    }

    res.status(200).json({ message: "We sent a 6-digit verification code to your email.", email });
  } catch (error) {
    console.error("Request registration code error:", error);
    res.status(500).json({ message: "Server error sending verification code" });
  }
};

// Just confirms the code — doesn't create the account. Flips the pending
// row to verified so completeRegistration below will accept a password
// for it, but keeps the same expiry window rather than resetting the
// clock, so "verified but never finished" can't be held open indefinitely.
const verifyRegistrationCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: "Email and code are required" });
    }

    const [rows] = await db.query("SELECT * FROM registration_codes WHERE email = ?", [email]);

    if (rows.length === 0) {
      return res.status(400).json({ message: "No code was requested for this email. Please register again." });
    }

    const pending = rows[0];

    if (new Date(pending.otp_expires_at) < new Date()) {
      await db.query("DELETE FROM registration_codes WHERE id = ?", [pending.id]);
      return res.status(400).json({ message: "This code has expired. Please register again." });
    }

    if (pending.otp_attempts >= MAX_OTP_ATTEMPTS) {
      await db.query("DELETE FROM registration_codes WHERE id = ?", [pending.id]);
      return res.status(400).json({ message: "Too many incorrect attempts. Please register again." });
    }

    if (hashOtp(code) !== pending.otp_hash) {
      await db.query("UPDATE registration_codes SET otp_attempts = otp_attempts + 1 WHERE id = ?", [pending.id]);
      return res.status(400).json({ message: "Incorrect code. Please try again." });
    }

    await db.query("UPDATE registration_codes SET verified = 1 WHERE id = ?", [pending.id]);

    res.json({ message: "Email verified. Please choose a password.", email });
  } catch (error) {
    console.error("Verify registration code error:", error);
    res.status(500).json({ message: "Server error verifying code" });
  }
};

// Final step — only reachable once verifyRegistrationCode has flipped the
// pending row to verified. This is where the account actually gets
// created, with the name/phone/password chosen after verification (role is
// decided separately in completeProfile, right after the first sign-in).
const completeRegistration = async (req, res) => {
  try {
    const { email, fullName, phone, password, confirmPassword } = req.body;

    if (!email || !fullName || !phone || !password || !confirmPassword) {
      return res.status(400).json({ message: "Please fill in all required fields" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: PASSWORD_REQUIREMENTS_MESSAGE });
    }

    const [rows] = await db.query("SELECT * FROM registration_codes WHERE email = ?", [email]);

    if (rows.length === 0 || !rows[0].verified) {
      return res.status(400).json({ message: "Please verify your email first." });
    }

    const pending = rows[0];

    if (new Date(pending.otp_expires_at) < new Date()) {
      await db.query("DELETE FROM registration_codes WHERE id = ?", [pending.id]);
      return res.status(400).json({ message: "Your verification has expired. Please register again." });
    }

    // Guards against the rare race where the email got registered some
    // other way (e.g. a second signup attempt) while this was still pending.
    const [existingUser] = await db.query("SELECT id FROM users WHERE email = ?", [email]);

    if (existingUser.length > 0) {
      await db.query("DELETE FROM registration_codes WHERE id = ?", [pending.id]);
      return res.status(409).json({ message: "Email already registered. Please sign in instead." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO users (full_name, email, phone, location, role, password, profile_completed)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [fullName, email, phone, "", "buyer", hashedPassword]
    );

    await db.query("DELETE FROM registration_codes WHERE id = ?", [pending.id]);

    await createNotification(
      "User Registration",
      "New buyer registered",
      `${fullName} created an account.`
    );

    const [[user]] = await db.query("SELECT * FROM users WHERE id = ?", [result.insertId]);

    issueSession(res, user);
  } catch (error) {
    console.error("Complete registration error:", error);
    res.status(500).json({ message: "Server error completing registration" });
  }
};

// One-time step after a brand-new account's first sign-in: picks a real
// role (never trusted beyond farmer/buyer — same guard as the old public
// registration form). Name/phone/password are already collected by
// completeRegistration above, so this is role-only.
const completeProfile = async (req, res) => {
  try {
    const { role } = req.body;

    if (role !== "farmer" && role !== "buyer") {
      return res.status(400).json({ message: "Please select a valid role" });
    }

    // Only ever applies once. Afterwards the role stays as it is (a repeat
    // submit just gets the account back unchanged), so this can't be used
    // to switch between farmer and buyer later on.
    await db.query(
      "UPDATE users SET role = ?, profile_completed = 1 WHERE id = ? AND profile_completed = 0",
      [role, req.user.id]
    );

    const [[user]] = await db.query("SELECT * FROM users WHERE id = ?", [req.user.id]);

    res.json({
      message: "Profile completed",
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        profileCompleted: !!user.profile_completed,
      },
    });
  } catch (error) {
    console.error("Complete profile error:", error);
    res.status(500).json({ message: "Server error completing profile" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const [users] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = users[0];

    // Accounts created through the old Google sign-up have no password
    // (they sign in with Google), which bcrypt would throw on.
    const isMatch = user.password ? await bcrypt.compare(password, user.password) : false;

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.is_active) {
      return res.status(403).json({
        message: "Your account has been deactivated. Contact the MAO administrator.",
      });
    }

    issueSession(res, user);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { accessToken, intent } = req.body;

    if (!accessToken) {
      return res.status(400).json({ message: "Missing Google access token" });
    }

    if (intent !== "login" && intent !== "register") {
      return res.status(400).json({ message: "Missing or invalid intent" });
    }

    const tokenInfoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
    );
    const tokenInfo = await tokenInfoRes.json();

    if (!tokenInfo.aud || tokenInfo.aud !== process.env.GOOGLE_CLIENT_ID) {
      return res.status(401).json({ message: "Invalid Google token" });
    }

    const profileRes = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const profile = await profileRes.json();

    if (!profile.email) {
      return res.status(400).json({
        message: "Could not get an email from Google.",
      });
    }

    if (profile.email_verified === false) {
      return res.status(400).json({ message: "Your Google email is not verified." });
    }

    const [users] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [profile.email]
    );

    const user = users[0];

    if (intent === "login") {
      if (!user) {
        return res.status(404).json({
          message: "No account found for this email. Please register first.",
        });
      }

      if (!user.is_active) {
        return res.status(403).json({
          message: "Your account has been deactivated. Contact the MAO administrator.",
        });
      }

      return issueSession(res, user);
    }

    // intent === "register": Google only vouches for the email address —
    // account creation still goes through the same emailed 6-digit code as
    // manual registration, so this kicks off that flow instead of creating
    // the account directly. profile.name is handed back purely so the
    // frontend can pre-fill the name field on the step that follows.
    if (user) {
      return res.status(409).json({ message: "Email already registered. Please sign in instead." });
    }

    try {
      await issueRegistrationCode(profile.email);
    } catch (emailError) {
      console.error("Failed to send registration code email:", emailError);
      return res.status(500).json({ message: "Could not send the verification code. Please try again." });
    }

    res.status(200).json({
      message: "We sent a 6-digit verification code to your email.",
      email: profile.email,
      fullName: profile.name || "",
    });
  } catch (error) {
    console.error("Google login error:", error);
    res.status(401).json({ message: "Google sign-in failed" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const [users] = await db.query(
      "SELECT id, full_name, email FROM users WHERE email = ?",
      [email]
    );

    // Always respond the same way whether or not the email exists, so this
    // endpoint can't be used to check which emails are registered.
    if (users.length > 0) {
      const user = users[0];
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.query(
        "UPDATE users SET reset_token_hash = ?, reset_token_expires = ? WHERE id = ?",
        [tokenHash, expires, user.id]
      );

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

      try {
        await sendPasswordResetEmail(user.email, resetUrl);
      } catch (emailError) {
        console.error("Failed to send password reset email:", emailError);
      }
    }

    res.json({
      message: "If that email is registered, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error requesting password reset" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({ message: "Please fill in all fields" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: PASSWORD_REQUIREMENTS_MESSAGE });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const [users] = await db.query(
      "SELECT id FROM users WHERE reset_token_hash = ? AND reset_token_expires > NOW()",
      [tokenHash]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: "This reset link is invalid or has expired." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      "UPDATE users SET password = ?, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = ?",
      [hashedPassword, users[0].id]
    );

    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error resetting password" });
  }
};

module.exports = {
  requestRegistrationCode,
  verifyRegistrationCode,
  completeRegistration,
  completeProfile,
  login,
  googleLogin,
  forgotPassword,
  resetPassword,
};
