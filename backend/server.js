const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");

dotenv.config();

const app = express();

// Only trust X-Forwarded-For when actually running behind a real reverse
// proxy (most hosting platforms). Trusting it otherwise would let a client
// spoof its IP and bypass rate limiting.
if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static("uploads"));

const authRoutes = require("./routes/authRoutes");
const farmerRoutes = require("./routes/farmerRoutes");
const listingRoutes = require("./routes/listingRoutes");
const messageRoutes = require("./routes/messageRoutes");
const buyerRoutes = require("./routes/buyerRoutes");
const marketplaceRoutes = require("./routes/marketplaceRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");
const buyerTransactionRoutes = require("./routes/buyerTransactionRoutes");
const buyerProfileRoutes = require("./routes/buyerProfileRoutes");
const adminRoutes = require("./routes/adminRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const adminListingRoutes = require("./routes/adminListingRoutes");
const adminMapRoutes = require("./routes/adminMapRoutes");
const adminVerificationRoutes = require("./routes/adminVerificationRoutes");
const adminTransactionRoutes = require("./routes/adminTransactionRoutes");
const adminNotificationRoutes = require("./routes/adminNotificationRoutes");
const adminReportRoutes = require("./routes/adminReportRoutes");
const adminSettingRoutes = require("./routes/adminSettingRoutes");

const protect = require("./middleware/authMiddleware");

app.get("/", (req, res) => {
  res.send("HerdMarket backend is running");
});

app.use("/api/auth", authRoutes);
app.use("/api/farmer", farmerRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/buyer", buyerRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/buyer-transactions", buyerTransactionRoutes);
app.use("/api/buyer/profile", buyerProfileRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/listings", adminListingRoutes);
app.use("/api/admin/map", adminMapRoutes);
app.use("/api/admin/verification", adminVerificationRoutes);
app.use("/api/admin/transactions", adminTransactionRoutes);
app.use("/api/admin/notifications", adminNotificationRoutes);
app.use("/api/admin/reports", adminReportRoutes);
app.use("/api/admin/settings", adminSettingRoutes);

app.get("/api/profile", protect, (req, res) => {
  res.json({
    message: "Protected profile data",
    user: req.user,
  });
});

app.use((err, req, res, next) => {
  // Drain any unread request body (e.g. remaining multipart file bytes) so
  // the connection can close cleanly instead of the client seeing a reset
  // connection with a truncated/empty response.
  req.resume();

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File is too large. Maximum size is 8MB." });
    }
    return res.status(400).json({ message: err.message });
  }

  if (err) {
    return res.status(400).json({ message: err.message || "Upload failed" });
  }

  next();
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});