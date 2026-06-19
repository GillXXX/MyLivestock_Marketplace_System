const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  getBuyerTransactions,
} = require("../controllers/buyerTransactionController");

router.get("/", protect, getBuyerTransactions);

module.exports = router;