const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const {
  getBuyerDashboard,
  getBuyerNotifications,
  markBuyerNotificationRead,
  markAllBuyerNotificationsRead,
  changeBuyerPassword,
} = require("../controllers/buyerController");

router.get("/dashboard", protect, getBuyerDashboard);
router.get("/notifications", protect, getBuyerNotifications);
router.put("/notifications/read-all", protect, markAllBuyerNotificationsRead);
router.put("/notifications/:id/read", protect, markBuyerNotificationRead);
router.put("/change-password", protect, changeBuyerPassword);

module.exports = router;