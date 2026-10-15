const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { dealLimiter } = require("../middleware/rateLimiter");

const { makeOffer, acceptOffer, recordWeight } = require("../controllers/dealController");

router.post("/:id/offer", protect, requireRole("farmer", "buyer"), dealLimiter, makeOffer);
router.post("/:id/accept", protect, requireRole("farmer", "buyer"), dealLimiter, acceptOffer);
// Ownership (seller only) is checked in the controller.
router.put("/:id/weight", protect, requireRole("farmer"), dealLimiter, recordWeight);

module.exports = router;
