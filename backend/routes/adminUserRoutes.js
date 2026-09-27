const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
  getAdminUsers,
  deleteUser,
  verifyUser,
  rejectVerification,
  setUserActive,
} = require("../controllers/adminUserController");

router.get("/", protect, requireRole("admin"), getAdminUsers);
router.delete("/:id", protect, requireRole("admin"), deleteUser);
router.put("/:id/verify", protect, requireRole("admin"), verifyUser);
router.put("/:id/reject-verification", protect, requireRole("admin"), rejectVerification);
router.put("/:id/status", protect, requireRole("admin"), setUserActive);

module.exports = router;