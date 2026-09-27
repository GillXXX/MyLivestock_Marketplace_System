const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const {
  getStaff,
  createStaff,
  setStaffActive,
  deleteStaff,
} = require("../controllers/adminStaffController");

router.get("/", protect, requireRole("admin"), getStaff);
router.post("/", protect, requireRole("admin"), createStaff);
router.put("/:id/status", protect, requireRole("admin"), setStaffActive);
router.delete("/:id", protect, requireRole("admin"), deleteStaff);

module.exports = router;
