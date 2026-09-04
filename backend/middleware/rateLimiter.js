const rateLimit = require("express-rate-limit");

// Login/Google sign-in: the actual brute-force target, so keep this tight.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again in 15 minutes." },
});

// Registration: looser, mainly to slow down automated account/spam creation.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many accounts created from this network. Please try again later." },
});

// Forgot/reset password: tight enough to stop inbox-spamming or token
// brute-forcing, loose enough that a user who fumbles the form isn't
// locked out for typos.
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many password reset attempts. Please try again in an hour." },
});

module.exports = { loginLimiter, registerLimiter, resetLimiter };
