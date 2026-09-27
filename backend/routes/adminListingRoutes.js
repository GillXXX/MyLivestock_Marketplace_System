const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const {
  getAdminListings,
  updateListingStatus,
  deleteListing,
} = require("../controllers/adminListingController");

router.get("/", protect, requireRole("admin", "mao_staff"), getAdminListings);
router.put("/:id/status", protect, requireRole("admin", "mao_staff"), updateListingStatus);
router.delete("/:id", protect, requireRole("admin", "mao_staff"), deleteListing);

module.exports = router;