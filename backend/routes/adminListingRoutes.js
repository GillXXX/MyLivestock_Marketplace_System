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
// Permanent, so admin only — MAO staff reject or flag a listing instead.
router.delete("/:id", protect, requireRole("admin"), deleteListing);

module.exports = router;