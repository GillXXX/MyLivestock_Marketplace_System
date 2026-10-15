const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const {
  getStaff,
  getStaffSessions,
  createStaff,
  updateStaff,
  resetStaffPassword,
  setStaffActive,
  deleteStaff,
} = require("../controllers/adminStaffController");

router.get("/", protect, requireRole("admin"), getStaff);
router.post("/", protect, requireRole("admin"), createStaff);
router.put("/:id", protect, requireRole("admin"), updateStaff);
router.get("/:id/sessions", protect, requireRole("admin"), getStaffSessions);
router.put("/:id/reset-password", protect, requireRole("admin"), resetStaffPassword);
router.put("/:id/status", protect, requireRole("admin"), setStaffActive);
router.delete("/:id", protect, requireRole("admin"), deleteStaff);

module.exports = router;
