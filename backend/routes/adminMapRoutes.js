const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { getAdminMapData } = require("../controllers/adminMapController");

router.get("/", protect, requireRole("admin", "mao_staff"), getAdminMapData);

module.exports = router;