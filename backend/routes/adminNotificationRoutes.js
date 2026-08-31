const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const {
  getAdminNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} = require("../controllers/adminNotificationController");

router.get("/", protect, getAdminNotifications);
router.put("/read-all", protect, markAllNotificationsRead);
router.put("/:id/read", protect, markNotificationRead);
router.delete("/:id", protect, deleteNotification);

module.exports = router;
