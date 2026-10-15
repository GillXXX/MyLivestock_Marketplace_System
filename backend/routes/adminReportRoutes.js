const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { getAdminReports, getFarmersByBarangay } = require("../controllers/adminReportController");

router.get("/", protect, requireRole("admin", "mao_staff"), getAdminReports);
router.get("/farmers-by-barangay", protect, requireRole("admin", "mao_staff"), getFarmersByBarangay);

module.exports = router;
