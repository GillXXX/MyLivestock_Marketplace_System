const express = require("express");
const router = express.Router();
const {
  requestRegistrationCode,
  verifyRegistrationCode,
  completeRegistration,
  completeProfile,
  login,
  googleLogin,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const {
  loginLimiter,
  resetLimiter,
  codeRequestLimiter,
  codeVerifyLimiter,
} = require("../middleware/rateLimiter");
const protect = require("../middleware/authMiddleware");

router.post("/register", codeRequestLimiter, requestRegistrationCode);
router.post("/register/verify", codeVerifyLimiter, verifyRegistrationCode);
router.post("/register/complete", codeRequestLimiter, completeRegistration);
router.post("/complete-profile", protect, completeProfile);
router.post("/login", loginLimiter, login);
router.post("/google", loginLimiter, googleLogin);
router.post("/forgot-password", resetLimiter, forgotPassword);
router.post("/reset-password", resetLimiter, resetPassword);

module.exports = router;
