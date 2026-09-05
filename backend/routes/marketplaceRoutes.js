const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const {
  getMarketplaceListings,
  getSellerProfile,
  createInquiry,
  recordListingView,
  createTransaction,
} = require("../controllers/marketplaceController");

router.get("/", protect, getMarketplaceListings);
router.get("/sellers/:id", protect, getSellerProfile);
router.post("/inquire", protect, createInquiry);
router.post("/:id/view", protect, recordListingView);
router.post("/:id/transactions", protect, createTransaction);

module.exports = router;