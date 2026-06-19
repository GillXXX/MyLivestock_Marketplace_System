const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  getAdminSettings,
  updateAdminSettings,
} = require("../controllers/adminSettingController");

router.get("/", protect, getAdminSettings);
router.put("/", protect, updateAdminSettings);

module.exports = router;