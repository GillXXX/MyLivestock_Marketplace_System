const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const { getAdminReports } = require("../controllers/adminReportController");

router.get("/", protect, getAdminReports);

module.exports = router;