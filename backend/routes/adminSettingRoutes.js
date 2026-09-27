const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const {
  getAdminSettings,
  updateAdminSettings,
} = require("../controllers/adminSettingController");

router.get("/", protect, requireRole("admin"), getAdminSettings);
router.put("/", protect, requireRole("admin"), updateAdminSettings);

module.exports = router;