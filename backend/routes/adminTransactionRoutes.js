const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const { getAdminTransactions } = require("../controllers/adminTransactionController");

router.get("/", protect, requireRole("admin", "mao_staff"), getAdminTransactions);

module.exports = router;
