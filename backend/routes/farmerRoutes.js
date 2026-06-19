const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const { getFarmerDashboard } = require("../controllers/farmerController");

router.get("/dashboard", protect, getFarmerDashboard);

module.exports = router;