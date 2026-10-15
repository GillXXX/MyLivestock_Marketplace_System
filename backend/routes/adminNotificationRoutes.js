const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
  getAdminNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} = require("../controllers/adminNotificationController");

router.get("/", protect, requireRole("admin", "mao_staff"), getAdminNotifications);
router.put("/read-all", protect, requireRole("admin", "mao_staff"), markAllNotificationsRead);
router.put("/:id/read", protect, requireRole("admin", "mao_staff"), markNotificationRead);
router.delete("/:id", protect, requireRole("admin", "mao_staff"), deleteNotification);

module.exports = router;
