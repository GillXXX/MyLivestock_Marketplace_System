const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { createNotification } = require("../utils/notify");
const { sendPasswordResetEmail } = require("../utils/mailer");

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
    },
  });
};

const register = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      location,
      farmLocation,
      role,
      password,
      confirmPassword,
    } = req.body;

    if (
      !fullName ||
      !email ||
      !phone ||
      !location ||
      !role ||
      !password ||
      !confirmPassword
    ) {
      return res.status(400).json({ message: "Please fill in all required fields" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (role === "farmer" && !farmLocation) {
      return res.status(400).json({ message: "Farm location is required for farmers" });
    }

    const [existingUser] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO users
      (full_name, email, phone, location, farm_location, role, password)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [fullName, email, phone, location, farmLocation || null, role, hashedPassword]
    );

    await createNotification(
      "User Registration",
      `New ${role} registered`,
      `${fullName} created a ${role} account.`
    );

    res.status(201).json({ message: "Account created successfully" });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error during registration" });
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

    const isMatch = await bcrypt.compare(password, user.password);

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
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ message: "Missing Google access token" });
    }

    const tokenInfoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`
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

    const [users] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [profile.email]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "No account found for this email. Please register first.",
      });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(403).json({
        message: "Your account has been deactivated. Contact the MAO administrator.",
      });
    }

    issueSession(res, user);
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

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
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

module.exports = { register, login, googleLogin, forgotPassword, resetPassword };
