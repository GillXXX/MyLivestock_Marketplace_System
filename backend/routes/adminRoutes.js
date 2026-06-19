const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const { getAdminDashboard } = require("../controllers/adminController");

router.get("/dashboard", protect, getAdminDashboard);

module.exports = router;