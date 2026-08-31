const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  getBuyerTransactions,
  confirmTransaction,
  cancelTransaction,
} = require("../controllers/buyerTransactionController");

router.get("/", protect, getBuyerTransactions);

router.put("/:id/confirm", protect, confirmTransaction);

router.put("/:id/cancel", protect, cancelTransaction);

module.exports = router;