const express = require("express");
const router = express.Router();
const { register, login, googleLogin } = require("../controllers/authController");
const { loginLimiter, registerLimiter } = require("../middleware/rateLimiter");

router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/google", loginLimiter, googleLogin);

module.exports = router;
