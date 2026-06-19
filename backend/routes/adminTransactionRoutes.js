const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  getAdminTransactions,
  updateTransactionStatus,
} = require("../controllers/adminTransactionController");

router.get("/", protect, getAdminTransactions);
router.put("/:id/status", protect, updateTransactionStatus);

module.exports = router;