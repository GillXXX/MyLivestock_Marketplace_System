const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
  getAdminUsers,
  getFarmerVerificationQueue,
  deleteUser,
  verifyUser,
  rejectVerification,
  setUserActive,
} = require("../controllers/adminUserController");

router.get("/", protect, requireRole("admin"), getAdminUsers);
// Farmer account verification is MAO's job too; managing accounts
// (delete, deactivate) stays with the Super Admin.
router.get("/verification-queue", protect, requireRole("admin", "mao_staff"), getFarmerVerificationQueue);
router.put("/:id/verify", protect, requireRole("admin", "mao_staff"), verifyUser);
router.put("/:id/reject-verification", protect, requireRole("admin", "mao_staff"), rejectVerification);
router.delete("/:id", protect, requireRole("admin"), deleteUser);
router.put("/:id/status", protect, requireRole("admin"), setUserActive);

module.exports = router;
