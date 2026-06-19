const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const { getAdminNotifications } = require("../controllers/adminNotificationController");

router.get("/", protect, getAdminNotifications);

module.exports = router;