// routes/buyerProfileRoutes.js
const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { profileLimiter } = require("../middleware/rateLimiter");
const upload = require("../middleware/uploadMiddleware");
const {
  getBuyerProfile,
  updateBuyerProfile,
} = require("../controllers/buyerProfileController");

router.get("/", protect, requireRole("buyer"), getBuyerProfile);
router.put("/", protect, requireRole("buyer"), profileLimiter, upload.single("profile_image"), updateBuyerProfile);

module.exports = router;