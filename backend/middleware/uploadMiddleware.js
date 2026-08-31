const multer = require("multer");
const path = require("path");

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB per file

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const DOCUMENT_MIME_TYPES = [...IMAGE_MIME_TYPES, "application/pdf"];

// Photo-only fields vs. fields that also accept scanned/PDF documents.
const IMAGE_ONLY_FIELDS = new Set(["profile_image", "image"]);

const fileFilter = (req, file, cb) => {
  const allowedTypes = IMAGE_ONLY_FIELDS.has(file.fieldname)
    ? IMAGE_MIME_TYPES
    : DOCUMENT_MIME_TYPES;

  if (!allowedTypes.includes(file.mimetype)) {
    const kind = IMAGE_ONLY_FIELDS.has(file.fieldname)
      ? "an image (JPG, PNG, WEBP, or GIF)"
      : "an image (JPG, PNG, WEBP, GIF) or PDF";

    cb(new Error(`"${file.fieldname}" must be ${kind}`));
    return;
  }

  cb(null, true);
};

const generateKey = (req, file, cb) => {
  cb(null, "profile-" + Date.now() + path.extname(file.originalname));
};

// Object storage is used when S3_BUCKET is configured; otherwise uploads
// fall back to local disk (fine for local dev, but local disk does not
// survive a redeploy on most hosts — set the S3_* env vars for production).
const s3Enabled = Boolean(process.env.S3_BUCKET);

let storage;
let getFileUrl;

if (s3Enabled) {
  const { S3Client } = require("@aws-sdk/client-s3");
  const multerS3 = require("multer-s3");

  const s3Client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });

  storage = multerS3({
    s3: s3Client,
    bucket: process.env.S3_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: generateKey,
    ...(process.env.S3_ACL ? { acl: process.env.S3_ACL } : {}),
  });

  const publicBase = process.env.S3_PUBLIC_URL
    ? process.env.S3_PUBLIC_URL.replace(/\/+$/, "")
    : null;

  getFileUrl = (file) => {
    if (publicBase) return `${publicBase}/${file.key}`;
    // Best-effort default — only correct for plain AWS S3 with no custom
    // domain. Non-AWS providers (R2, Spaces, B2, MinIO, ...) should set
    // S3_PUBLIC_URL explicitly, since their upload endpoint usually isn't
    // the same as their public read URL.
    return file.location;
  };
} else {
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/");
    },
    filename: generateKey,
  });

  getFileUrl = (file, req) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    return `${baseUrl}/uploads/${file.filename}`;
  };
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
});

module.exports = upload;
module.exports.getFileUrl = getFileUrl;
module.exports.isS3Enabled = s3Enabled;
