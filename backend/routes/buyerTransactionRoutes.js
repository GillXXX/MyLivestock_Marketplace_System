const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { dealLimiter } = require("../middleware/rateLimiter");

const {
  getBuyerTransactions,
  confirmTransaction,
  cancelTransaction,
} = require("../controllers/buyerTransactionController");

router.get("/", protect, requireRole("buyer"), getBuyerTransactions);

router.put("/:id/confirm", protect, requireRole("buyer"), dealLimiter, confirmTransaction);

router.put("/:id/cancel", protect, requireRole("buyer"), dealLimiter, cancelTransaction);

module.exports = router;