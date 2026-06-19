const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const { getMarketplaceListings } = require("../controllers/marketplaceController");

router.get("/", protect, getMarketplaceListings);

module.exports = router;