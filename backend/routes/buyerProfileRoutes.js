// routes/buyerProfileRoutes.js
const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const { getBuyerProfile } = require("../controllers/buyerProfileController");

router.get("/", protect, getBuyerProfile);

module.exports = router;