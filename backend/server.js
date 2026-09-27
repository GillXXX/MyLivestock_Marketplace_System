const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");
const multer = require("multer");

dotenv.config();

const app = express();

// The frontend always lives on a different origin than this API (different
// port in dev, different domain in production), and that's by design — not
// something to lock down. Helmet's default same-origin CORP would make the
// browser silently refuse to render anything this server serves (profile
// photos, listing images, uploaded documents) once embedded from that other
// origin, even though the request itself succeeds with a 200.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

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

// Locally stored uploads are saved in the database as absolute URLs that
// contain whatever host the server was reached on at upload time (a LAN IP
// that later changes, localhost, ...), which leaves every previously
// uploaded photo/document pointing at a dead address. Rewrite them to the
// host the current request actually used so they always resolve. Skipped
// with S3, where the stored URLs are already permanent public URLs.
if (!process.env.S3_BUCKET) {
  const STORED_UPLOAD_URL = /https?:\/\/[^"\\/\s]+\/uploads\//g;

  app.use((req, res, next) => {
    const sendJson = res.json.bind(res);

    res.json = (body) => {
      const text = JSON.stringify(body);
      if (text === undefined || !text.includes("/uploads/")) return sendJson(body);

      const base = `${req.protocol}://${req.get("host")}`;
      res.type("json");
      return res.send(text.replace(STORED_UPLOAD_URL, `${base}/uploads/`));
    };

    next();
  });
}

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
const adminStaffRoutes = require("./routes/adminStaffRoutes");
const adminListingRoutes = require("./routes/adminListingRoutes");
const adminMapRoutes = require("./routes/adminMapRoutes");
const adminVerificationRoutes = require("./routes/adminVerificationRoutes");
const adminTransactionRoutes = require("./routes/adminTransactionRoutes");
const adminNotificationRoutes = require("./routes/adminNotificationRoutes");
const adminReportRoutes = require("./routes/adminReportRoutes");
const adminSettingRoutes = require("./routes/adminSettingRoutes");
const publicRoutes = require("./routes/publicRoutes");

const protect = require("./middleware/authMiddleware");

app.get("/", (req, res) => {
  res.send("VOLT backend is running");
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
app.use("/api/admin/staff", adminStaffRoutes);
app.use("/api/admin/listings", adminListingRoutes);
app.use("/api/admin/map", adminMapRoutes);
app.use("/api/admin/verification", adminVerificationRoutes);
app.use("/api/admin/transactions", adminTransactionRoutes);
app.use("/api/admin/notifications", adminNotificationRoutes);
app.use("/api/admin/reports", adminReportRoutes);
app.use("/api/admin/settings", adminSettingRoutes);
app.use("/api/public", publicRoutes);

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
      const maxSize = err.field === "attachment" ? "25MB" : "8MB";
      return res.status(400).json({ message: `File is too large. Maximum size is ${maxSize}.` });
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