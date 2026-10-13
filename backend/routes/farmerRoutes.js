const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");

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
  upload.single("profile_image"),
  updateFarmerProfile
);

router.get("/transactions", protect, requireRole("farmer"), getFarmerTransactions);

router.put("/transactions/:id/advance", protect, requireRole("farmer"), advanceTransactionStep);

router.put("/transactions/:id/decline", protect, requireRole("farmer"), declineTransaction);

router.put("/transactions/:id/cancellation", protect, requireRole("farmer"), respondToCancellation);

router.post(
  "/verification",
  protect,
  requireRole("farmer"),
  upload.fields([
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