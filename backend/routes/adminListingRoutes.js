const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  getAdminListings,
  updateListingStatus,
  deleteListing,
} = require("../controllers/adminListingController");

router.get("/", protect, getAdminListings);
router.put("/:id/status", protect, updateListingStatus);
router.delete("/:id", protect, deleteListing);

module.exports = router;