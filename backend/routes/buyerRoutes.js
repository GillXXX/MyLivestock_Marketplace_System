const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const {
  getBuyerDashboard,
  getBuyerNotifications,
  changeBuyerPassword,
} = require("../controllers/buyerController");

router.get("/dashboard", protect, getBuyerDashboard);
router.get("/notifications", protect, getBuyerNotifications);
router.put("/change-password", protect, changeBuyerPassword);

module.exports = router;