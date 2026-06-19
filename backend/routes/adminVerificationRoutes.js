const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  getAdminVerification,
  updateVerificationStatus,
} = require("../controllers/adminVerificationController");

router.get("/", protect, getAdminVerification);
router.put("/:id/status", protect, updateVerificationStatus);

module.exports = router;