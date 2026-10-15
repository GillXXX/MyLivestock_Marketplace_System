const rateLimit = require("express-rate-limit");

// Login/Google sign-in: the actual brute-force target, so keep this tight.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again in 15 minutes." },
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

// Requesting a registration code (also used for "resend"): loose enough
// for a genuine "it didn't arrive" retry, tight enough to stop
// inbox-spamming/automated account creation.
const codeRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many code requests. Please wait a bit before trying again." },
});

// Verifying the 6-digit registration code: the actual brute-force target
// (only 1,000,000 possible codes), so keep this tight like loginLimiter.
const codeVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in 15 minutes." },
});

module.exports = {
  loginLimiter,
  resetLimiter,
  codeRequestLimiter,
  codeVerifyLimiter,
};
