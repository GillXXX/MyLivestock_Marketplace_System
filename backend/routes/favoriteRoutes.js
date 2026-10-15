const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { marketplaceLimiter } = require("../middleware/rateLimiter");
const {
  getFavorites,
  addFavorite,
  removeFavorite,
} = require("../controllers/favoriteController");

router.get("/", protect, requireRole("buyer"), getFavorites);
router.post("/", protect, requireRole("buyer"), marketplaceLimiter, addFavorite);
router.delete("/:listingId", protect, requireRole("buyer"), removeFavorite);

module.exports = router;