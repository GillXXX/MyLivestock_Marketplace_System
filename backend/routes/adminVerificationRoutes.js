const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const {
  getAdminVerification,
  updateVerificationStatus,
} = require("../controllers/adminVerificationController");

router.get("/", protect, requireRole("admin", "mao_staff"), getAdminVerification);
router.put("/:id/status", protect, requireRole("admin", "mao_staff"), updateVerificationStatus);

module.exports = router;