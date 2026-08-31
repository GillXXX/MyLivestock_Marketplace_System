const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const {
  getAdminUsers,
  deleteUser,
  verifyUser,
  rejectVerification,
  setUserActive,
} = require("../controllers/adminUserController");

router.get("/", protect, getAdminUsers);
router.delete("/:id", protect, deleteUser);
router.put("/:id/verify", protect, verifyUser);
router.put("/:id/reject-verification", protect, rejectVerification);
router.put("/:id/status", protect, setUserActive);

module.exports = router;