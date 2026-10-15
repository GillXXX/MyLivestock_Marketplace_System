const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { getAdminDashboard } = require("../controllers/adminController");

router.get("/dashboard", protect, requireRole("admin", "mao_staff"), getAdminDashboard);

module.exports = router;