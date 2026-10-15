const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { marketplaceLimiter } = require("../middleware/rateLimiter");
const {
  getMarketplaceListings,
  getSellerProfile,
  createInquiry,
  recordListingView,
  createTransaction,
} = require("../controllers/marketplaceController");

router.get("/", protect, requireRole("buyer"), getMarketplaceListings);
router.get("/sellers/:id", protect, requireRole("buyer"), getSellerProfile);
router.post("/inquire", protect, requireRole("buyer"), marketplaceLimiter, createInquiry);
router.post("/:id/view", protect, requireRole("buyer"), recordListingView);
router.post("/:id/transactions", protect, requireRole("buyer"), marketplaceLimiter, createTransaction);

module.exports = router;