const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const { getBuyerDashboard } = require("../controllers/buyerController");

router.get("/dashboard", protect, getBuyerDashboard);

module.exports = router;