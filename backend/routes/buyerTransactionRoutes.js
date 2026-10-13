const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const {
  getBuyerTransactions,
  confirmTransaction,
  cancelTransaction,
} = require("../controllers/buyerTransactionController");

router.get("/", protect, requireRole("buyer"), getBuyerTransactions);

router.put("/:id/confirm", protect, requireRole("buyer"), confirmTransaction);

router.put("/:id/cancel", protect, requireRole("buyer"), cancelTransaction);

module.exports = router;