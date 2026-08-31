// routes/buyerProfileRoutes.js
const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  getBuyerProfile,
  updateBuyerProfile,
} = require("../controllers/buyerProfileController");

router.get("/", protect, getBuyerProfile);
router.put("/", protect, upload.single("profile_image"), updateBuyerProfile);

module.exports = router;