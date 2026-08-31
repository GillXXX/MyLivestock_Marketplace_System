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

module.exports = { loginLimiter, registerLimiter };
