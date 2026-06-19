const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const { getMyListings, createListing } = require("../controllers/listingController");

router.get("/my-listings", protect, getMyListings);
router.post("/", protect, createListing);

module.exports = router;