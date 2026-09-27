const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { getAdminReports } = require("../controllers/adminReportController");

router.get("/", protect, requireRole("admin", "mao_staff"), getAdminReports);

module.exports = router;