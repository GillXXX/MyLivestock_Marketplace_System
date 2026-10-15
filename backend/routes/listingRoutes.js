const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { listingLimiter } = require("../middleware/rateLimiter");
const {
  getMyListings,
  createListing,
  getListingById,
  updateListing,
  deleteListing,
  publishListing,
} = require("../controllers/listingController");

const listingUpload = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "documents", maxCount: 1 },
]);

router.get("/my-listings", protect, requireRole("farmer"), getMyListings);
router.post("/", protect, requireRole("farmer"), listingLimiter, listingUpload, createListing);
router.get("/:id", protect, requireRole("farmer"), getListingById);
router.put("/:id", protect, requireRole("farmer"), listingLimiter, listingUpload, updateListing);
router.put("/:id/publish", protect, requireRole("farmer"), listingLimiter, publishListing);
router.delete("/:id", protect, requireRole("farmer"), listingLimiter, deleteListing);

module.exports = router;