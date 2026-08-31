const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  getMyListings,
  createListing,
  getListingById,
  updateListing,
  deleteListing,
} = require("../controllers/listingController");

const listingUpload = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "documents", maxCount: 5 },
]);

router.get("/my-listings", protect, getMyListings);
router.post("/", protect, listingUpload, createListing);
router.get("/:id", protect, getListingById);
router.put("/:id", protect, listingUpload, updateListing);
router.delete("/:id", protect, deleteListing);

module.exports = router;