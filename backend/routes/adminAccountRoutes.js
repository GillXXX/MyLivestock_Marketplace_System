const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { changeOwnPassword } = require("../controllers/adminAccountController");

// Admin only — MAO staff passwords are set and reset by the admin
// (Staff Management), never by the staff member.
router.put("/change-password", protect, requireRole("admin"), changeOwnPassword);

module.exports = router;
