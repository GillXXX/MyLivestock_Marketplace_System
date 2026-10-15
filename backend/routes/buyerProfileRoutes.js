// routes/buyerProfileRoutes.js
const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  getBuyerProfile,
  updateBuyerProfile,
} = require("../controllers/buyerProfileController");

router.get("/", protect, requireRole("buyer"), getBuyerProfile);
router.put("/", protect, requireRole("buyer"), upload.single("profile_image"), updateBuyerProfile);

module.exports = router;