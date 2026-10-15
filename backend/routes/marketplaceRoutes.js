const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
  getMarketplaceListings,
  getSellerProfile,
  createInquiry,
  recordListingView,
  createTransaction,
} = require("../controllers/marketplaceController");

router.get("/", protect, requireRole("buyer"), getMarketplaceListings);
router.get("/sellers/:id", protect, requireRole("buyer"), getSellerProfile);
router.post("/inquire", protect, requireRole("buyer"), createInquiry);
router.post("/:id/view", protect, requireRole("buyer"), recordListingView);
router.post("/:id/transactions", protect, requireRole("buyer"), createTransaction);

module.exports = router;