const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("HerdMarket backend is running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const protect = require("./middleware/authMiddleware");

app.get("/api/profile", protect, (req, res) => {
  res.json({
    message: "Protected profile data",
    user: req.user,
  });
});

const farmerRoutes = require("./routes/farmerRoutes");

app.use("/api/farmer", farmerRoutes);

const listingRoutes = require("./routes/listingRoutes");

app.use("/api/listings", listingRoutes);

const messageRoutes = require("./routes/messageRoutes");

app.use("/api/messages", messageRoutes);

const buyerRoutes = require("./routes/buyerRoutes");

app.use("/api/buyer", buyerRoutes);

const marketplaceRoutes = require("./routes/marketplaceRoutes");

app.use("/api/marketplace", marketplaceRoutes);

const favoriteRoutes = require("./routes/favoriteRoutes");

app.use("/api/favorites", favoriteRoutes);

const buyerTransactionRoutes = require("./routes/buyerTransactionRoutes");

app.use("/api/buyer-transactions", buyerTransactionRoutes);

const buyerProfileRoutes = require("./routes/buyerProfileRoutes");
app.use("/api/buyer/profile", buyerProfileRoutes);

const adminRoutes = require("./routes/adminRoutes");

app.use("/api/admin", adminRoutes);

const adminUserRoutes = require("./routes/adminUserRoutes");

app.use("/api/admin/users", adminUserRoutes);

const adminListingRoutes = require("./routes/adminListingRoutes");

app.use("/api/admin/listings", adminListingRoutes);

const adminMapRoutes = require("./routes/adminMapRoutes");

app.use("/api/admin/map", adminMapRoutes);

const adminVerificationRoutes = require("./routes/adminVerificationRoutes");

app.use("/api/admin/verification", adminVerificationRoutes);

const adminTransactionRoutes = require("./routes/adminTransactionRoutes");

app.use("/api/admin/transactions", adminTransactionRoutes);

const adminNotificationRoutes = require("./routes/adminNotificationRoutes");

app.use("/api/admin/notifications", adminNotificationRoutes);

const adminReportRoutes = require("./routes/adminReportRoutes");

app.use("/api/admin/reports", adminReportRoutes);

const adminSettingRoutes = require("./routes/adminSettingRoutes");

app.use("/api/admin/settings", adminSettingRoutes);