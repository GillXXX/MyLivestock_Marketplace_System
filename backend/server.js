const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");
const multer = require("multer");

dotenv.config();

const app = express();

// When the React app has been built, this server also serves it, so one Node
// app on one domain runs the whole site. Hostinger only deploys backend/, so
// there the build is copied into backend/frontend-build beforehand (npm run
// build at the repo root). In local development the React dev server serves
// the frontend instead and this is skipped.
const FRONTEND_BUILD_DIR =
  process.env.FRONTEND_BUILD_DIR ||
  [path.join(__dirname, "frontend-build"), path.join(__dirname, "..", "frontend", "build")].find(
    (dir) => fs.existsSync(path.join(dir, "index.html"))
  ) ||
  path.join(__dirname, "frontend-build");
const SERVE_FRONTEND = fs.existsSync(path.join(FRONTEND_BUILD_DIR, "index.html"));

// The frontend may live on a different origin than this API (different
// port in dev, different domain in some deployments). Helmet's default
// same-origin CORP would make the browser silently refuse to render
// anything this server serves (profile photos, listing images, uploaded
// documents) once embedded from that other origin, even though the request
// itself succeeds with a 200.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // Helmet's default Content-Security-Policy blocks what the React app
    // needs when this server serves it: its inline startup script, map
    // tiles (OpenStreetMap/Esri), route lookups (OSRM) and Google Sign-In.
    contentSecurityPolicy: false,
    // "same-origin" breaks the Google Sign-In popup.
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    // "no-referrer" gets the map blank: OpenStreetMap's tile servers refuse
    // tile requests that don't say which site they come from.
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

// Which proxies' X-Forwarded-For to believe, so login rate limiting sees
// each visitor's real IP instead of one shared proxy IP (which would make
// everyone share a single limit). By default only a proxy on this same
// machine (loopback) — the React dev server's proxy, or a host's local
// front proxy — so a client connecting directly can't spoof its IP.
// TRUST_PROXY=true trusts one proxy hop from anywhere, for hosts whose
// proxy connects from another address.
app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : "loopback");

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

// Files uploaded before extensions were tied to the file's checked type may
// have any extension (.html, .svg, ...). Anything that isn't one of the
// allowed image/video/PDF types is only ever offered as a download, so it
// can never open as a page on this site.
const { SAFE_UPLOAD_EXTENSIONS } = require("./middleware/uploadMiddleware");

app.use(
  "/uploads",
  express.static("uploads", {
    setHeaders: (res, filePath) => {
      const extension = path.extname(filePath).toLowerCase();
      if (!SAFE_UPLOAD_EXTENSIONS.has(extension) && extension !== ".jpeg") {
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("Content-Disposition", "attachment");
      }
    },
  })
);

const authRoutes = require("./routes/authRoutes");
const farmerRoutes = require("./routes/farmerRoutes");
const listingRoutes = require("./routes/listingRoutes");
const messageRoutes = require("./routes/messageRoutes");
const buyerRoutes = require("./routes/buyerRoutes");
const marketplaceRoutes = require("./routes/marketplaceRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");
const buyerTransactionRoutes = require("./routes/buyerTransactionRoutes");
const dealRoutes = require("./routes/dealRoutes");
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
const adminAccountRoutes = require("./routes/adminAccountRoutes");
const publicRoutes = require("./routes/publicRoutes");

const protect = require("./middleware/authMiddleware");

if (!SERVE_FRONTEND) {
  app.get("/", (req, res) => {
    res.send("VOLT backend is running");
  });
}

app.use("/api/auth", authRoutes);
app.use("/api/farmer", farmerRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/buyer", buyerRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/buyer-transactions", buyerTransactionRoutes);
app.use("/api/deals", dealRoutes);
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
app.use("/api/admin/account", adminAccountRoutes);
app.use("/api/public", publicRoutes);

// Deployment check: is the app up, are its required settings present and
// does the database answer. Only names missing settings and a yes/no for
// the database — the actual database error (which can include its user and
// host) goes to the server log, never to the browser.
app.get("/api/health", async (req, res) => {
  const missingSettings = ["DB_HOST", "DB_USER", "DB_NAME", "JWT_SECRET", "GOOGLE_CLIENT_ID"].filter(
    (key) => !process.env[key]
  );
  let database = "ok";
  try {
    await require("./config/db").query("SELECT 1 FROM users LIMIT 1");
  } catch (error) {
    console.error("Health check database error:", error);
    database = "error";
  }
  const healthy = database === "ok" && missingSettings.length === 0;
  res.status(healthy ? 200 : 503).json({ status: healthy ? "ok" : "error", database, missingSettings });
});

app.get("/api/profile", protect, (req, res) => {
  res.json({
    message: "Protected profile data",
    user: req.user,
  });
});

// The built React app: its files, and index.html for every page route
// (/marketplace, /buyer-map, ...) so refreshing or opening a link to any
// page works. API and upload paths are never answered with the page.
if (SERVE_FRONTEND) {
  app.use(express.static(FRONTEND_BUILD_DIR));

  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api/") || req.path.startsWith("/uploads/")) {
      return next();
    }
    res.sendFile(path.join(FRONTEND_BUILD_DIR, "index.html"));
  });
}

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
  if (SERVE_FRONTEND) console.log(`Serving the website from ${FRONTEND_BUILD_DIR}`);
});

// Approve cancellation requests sellers left unanswered past the deadline.
// The transaction pages also run this before showing anything, so this
// timer only covers orders nobody is looking at.
const { autoApproveExpiredCancellations } = require("./utils/orderStock");
const runCancellationAutoApprove = () =>
  autoApproveExpiredCancellations().catch((error) =>
    console.error("Cancellation auto-approve error:", error)
  );
runCancellationAutoApprove();
setInterval(runCancellationAutoApprove, 10 * 60 * 1000);