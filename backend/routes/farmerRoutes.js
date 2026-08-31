const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const {
  getFarmerDashboard,
  getFarmerProfile,
  updateFarmerProfile,
  getFarmerTransactions,
  advanceTransactionStep,
  declineTransaction,
  submitVerification,
  getFarmerNotifications,
  changeFarmerPassword,
} = require("../controllers/farmerController");

router.get("/dashboard", protect, getFarmerDashboard);

router.get("/profile", protect, getFarmerProfile);

router.put(
  "/profile",
  protect,
  upload.single("profile_image"),
  updateFarmerProfile
);

router.get("/transactions", protect, getFarmerTransactions);

router.put("/transactions/:id/advance", protect, advanceTransactionStep);

router.put("/transactions/:id/decline", protect, declineTransaction);

router.post(
  "/verification",
  protect,
  upload.fields([
    { name: "government_id", maxCount: 1 },
    { name: "barangay_certificate", maxCount: 1 },
  ]),
  submitVerification
);

router.get("/notifications", protect, getFarmerNotifications);

router.put("/change-password", protect, changeFarmerPassword);

module.exports = router;