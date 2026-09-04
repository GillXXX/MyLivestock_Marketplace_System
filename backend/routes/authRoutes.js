const express = require("express");
const router = express.Router();
const {
  register,
  login,
  googleLogin,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const { loginLimiter, registerLimiter, resetLimiter } = require("../middleware/rateLimiter");

router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/google", loginLimiter, googleLogin);
router.post("/forgot-password", resetLimiter, forgotPassword);
router.post("/reset-password", resetLimiter, resetPassword);

module.exports = router;
