const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
  getBuyerDashboard,
  getBuyerNotifications,
  markBuyerNotificationRead,
  markAllBuyerNotificationsRead,
  changeBuyerPassword,
} = require("../controllers/buyerController");

router.get("/dashboard", protect, requireRole("buyer"), getBuyerDashboard);
router.get("/notifications", protect, requireRole("buyer"), getBuyerNotifications);
router.put("/notifications/read-all", protect, requireRole("buyer"), markAllBuyerNotificationsRead);
router.put("/notifications/:id/read", protect, requireRole("buyer"), markBuyerNotificationRead);
router.put("/change-password", protect, requireRole("buyer"), changeBuyerPassword);

module.exports = router;