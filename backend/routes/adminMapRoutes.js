const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const { getAdminMapData } = require("../controllers/adminMapController");

router.get("/", protect, getAdminMapData);

module.exports = router;