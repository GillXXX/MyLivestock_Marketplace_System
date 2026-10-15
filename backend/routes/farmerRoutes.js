const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { profileLimiter, verificationLimiter, dealLimiter } = require("../middleware/rateLimiter");
const upload = require("../middleware/uploadMiddleware");
const { privateUpload } = require("../middleware/uploadMiddleware");

const {
  getFarmerDashboard,
  getFarmerProfile,
  updateFarmerProfile,
  getFarmerTransactions,
  advanceTransactionStep,
  declineTransaction,
  respondToCancellation,
  submitVerification,
  getFarmerNotifications,
  markFarmerNotificationRead,
  markAllFarmerNotificationsRead,
  changeFarmerPassword,
} = require("../controllers/farmerController");

router.get("/dashboard", protect, requireRole("farmer"), getFarmerDashboard);

router.get("/profile", protect, requireRole("farmer"), getFarmerProfile);

router.put(
  "/profile",
  protect,
  requireRole("farmer"),
  profileLimiter,
  upload.single("profile_image"),
  updateFarmerProfile
);

router.get("/transactions", protect, requireRole("farmer"), getFarmerTransactions);

router.put("/transactions/:id/advance", protect, requireRole("farmer"), dealLimiter, advanceTransactionStep);

router.put("/transactions/:id/decline", protect, requireRole("farmer"), dealLimiter, declineTransaction);

router.put("/transactions/:id/cancellation", protect, requireRole("farmer"), dealLimiter, respondToCancellation);

router.post(
  "/verification",
  protect,
  requireRole("farmer"),
  verificationLimiter,
  privateUpload.fields([
    { name: "government_id", maxCount: 1 },
    { name: "barangay_certificate", maxCount: 1 },
  ]),
  submitVerification
);

router.get("/notifications", protect, requireRole("farmer"), getFarmerNotifications);

router.put("/notifications/read-all", protect, requireRole("farmer"), markAllFarmerNotificationsRead);

router.put("/notifications/:id/read", protect, requireRole("farmer"), markFarmerNotificationRead);

router.put("/change-password", protect, requireRole("farmer"), changeFarmerPassword);

module.exports = router;