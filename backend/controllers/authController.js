const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { createNotification } = require("../utils/notify");
const { sendPasswordResetEmail, sendRegistrationCodeEmail } = require("../utils/mailer");
const { isStrongPassword, PASSWORD_REQUIREMENTS_MESSAGE } = require("../utils/validators");

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const GOOGLE_SIGNUP_PURPOSE = "google-signup";
const MAX_OTP_ATTEMPTS = 5;

const generateOtp = () => crypto.randomInt(0, 1000000).toString().padStart(6, "0");
const hashOtp = (code) => crypto.createHash("sha256").update(String(code)).digest("hex");

// Admin and MAO staff sign-ins are recorded (staff_sessions) so the admin
// can see when each staff member signed in and out. The session id goes in
// the token, so signing out ends it on the server too (see protect).
const STAFF_ROLES = ["admin", "mao_staff"];

const issueSession = async (req, res, user, loginMethod = "password") => {
  let sessionId = null;

  if (STAFF_ROLES.includes(user.role)) {
    const [session] = await db.query(
      "INSERT INTO staff_sessions (user_id, login_method, ip_address, user_agent) VALUES (?, ?, ?, ?)",
      [user.id, loginMethod, req.ip || null, (req.get("user-agent") || "").slice(0, 255) || null]
    );
    sessionId = session.insertId;
  }

  await db.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [user.id]);

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      ...(sessionId ? { sid: sessionId } : {}),
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
// created, with the role, name, phone and password chosen after
// verification — nothing exists in `users` until the person has picked
// whether they are a farmer or a buyer.
const completeRegistration = async (req, res) => {
  try {
    const { email, role, fullName, phone, password, confirmPassword } = req.body;

    if (role !== "farmer" && role !== "buyer") {
      return res.status(400).json({ message: "Please choose whether you are a farmer or a buyer" });
    }

    if (!email || !fullName?.trim() || !phone?.trim() || !password || !confirmPassword) {
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
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [fullName.trim(), email, phone.trim(), "", role, hashedPassword]
    );

    await db.query("DELETE FROM registration_codes WHERE id = ?", [pending.id]);

    await createNotification(
      "User Registration",
      `New ${role} registered`,
      `${fullName.trim()} created a ${role} account.`
    );

    const [[user]] = await db.query("SELECT * FROM users WHERE id = ?", [result.insertId]);

    await issueSession(req, res, user);
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

    await issueSession(req, res, user);
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

    if (!tokenInfoRes.ok) {
      console.error("Google token check failed:", tokenInfo);
      return res.status(401).json({ message: "Google sign-in expired or was rejected. Please try again." });
    }

    // GOOGLE_CLIENT_ID (backend) must be the same client as
    // REACT_APP_GOOGLE_CLIENT_ID (frontend build), or every token fails here.
    if (!tokenInfo.aud || tokenInfo.aud !== process.env.GOOGLE_CLIENT_ID) {
      console.error(
        `Google token is for client ${tokenInfo.aud}, but GOOGLE_CLIENT_ID is ${process.env.GOOGLE_CLIENT_ID || "(not set)"}`
      );
      return res.status(401).json({ message: "Invalid Google token" });
    }

    const profileRes = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const profile = await profileRes.json();

    if (!profile.email) {
      console.error("Google profile has no email:", profileRes.status, profile);
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

    if (intent === "login" && user) {
      if (!user.is_active) {
        return res.status(403).json({
          message: "Your account has been deactivated. Contact the MAO administrator.",
        });
      }

      return await issueSession(req, res, user, "google");
    }

    if (user) {
      return res.status(409).json({ message: "Email already registered. Please sign in instead." });
    }

    // A Google account with no VOLT account yet — from the sign-up page, or
    // "Continue with Google" on the sign-in page. Google has already
    // confirmed the email, so no emailed code is needed, but nothing is
    // created yet either: the person still has to choose farmer or buyer
    // and fill in their name, phone and password.
    // The short-lived signup token carries the Google-confirmed email to
    // completeGoogleSignup, so it can't be swapped for another address.
    const signupToken = jwt.sign(
      { purpose: GOOGLE_SIGNUP_PURPOSE, email: profile.email, name: profile.name || "" },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.status(200).json({
      needsRole: true,
      signupToken,
      email: profile.email,
      fullName: profile.name || "",
    });
  } catch (error) {
    // Something on our side (database, network to Google, ...) — not the
    // person's Google account — so say so instead of a generic "failed".
    console.error("Google login error:", error);
    res.status(500).json({ message: "Server error during Google sign-in. Please try again." });
  }
};

// Creates the account for a new Google sign-up — the same role, name,
// phone and password as an email sign-up, minus the emailed code (Google
// already confirmed the email). The password lets the account sign in
// with email too, not only with Google.
const completeGoogleSignup = async (req, res) => {
  try {
    const { signupToken, role, fullName, phone, password, confirmPassword } = req.body;

    if (role !== "farmer" && role !== "buyer") {
      return res.status(400).json({ message: "Please choose whether you are a farmer or a buyer" });
    }

    if (!fullName?.trim() || !phone?.trim() || !password || !confirmPassword) {
      return res.status(400).json({ message: "Please fill in all required fields" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: PASSWORD_REQUIREMENTS_MESSAGE });
    }

    let signup;
    try {
      signup = jwt.verify(signupToken, process.env.JWT_SECRET);
    } catch (error) {
      signup = null;
    }

    if (!signup || signup.purpose !== GOOGLE_SIGNUP_PURPOSE || !signup.email) {
      return res.status(401).json({ message: "Your Google sign-up expired. Please continue with Google again." });
    }

    const [existingUser] = await db.query("SELECT id FROM users WHERE email = ?", [signup.email]);

    if (existingUser.length > 0) {
      return res.status(409).json({ message: "Email already registered. Please sign in instead." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO users (full_name, email, phone, location, role, password, profile_completed)
       VALUES (?, ?, ?, '', ?, ?, 1)`,
      [fullName.trim(), signup.email, phone.trim(), role, hashedPassword]
    );

    // A manual sign-up for the same email may have been started earlier.
    await db.query("DELETE FROM registration_codes WHERE email = ?", [signup.email]);

    await createNotification(
      "User Registration",
      `New ${role} registered`,
      `${fullName.trim()} created a ${role} account with Google.`
    );

    const [[user]] = await db.query("SELECT * FROM users WHERE id = ?", [result.insertId]);

    await issueSession(req, res, user, "google");
  } catch (error) {
    console.error("Complete Google signup error:", error);
    res.status(500).json({ message: "Server error creating your account" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // MAO staff passwords are only ever reset by the admin (Staff
    // Management), so staff accounts get no reset link.
    const [users] = await db.query(
      "SELECT id, full_name, email FROM users WHERE email = ? AND role <> 'mao_staff'",
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
      "SELECT id FROM users WHERE reset_token_hash = ? AND reset_token_expires > NOW() AND role <> 'mao_staff'",
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

// Ends this sign-in on the server: for admin / MAO staff it records the
// sign-out time and makes the token unusable (protect checks the session).
// Other accounts have no server-side session, so there's nothing to end.
const logout = async (req, res) => {
  try {
    if (req.user.sid) {
      await db.query(
        "UPDATE staff_sessions SET logged_out_at = NOW() WHERE id = ? AND user_id = ? AND logged_out_at IS NULL",
        [req.user.sid, req.user.id]
      );
    }

    res.json({ message: "Logged out" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Server error logging out" });
  }
};

module.exports = {
  logout,
  requestRegistrationCode,
  verifyRegistrationCode,
  completeRegistration,
  completeProfile,
  login,
  googleLogin,
  completeGoogleSignup,
  forgotPassword,
  resetPassword,
};
