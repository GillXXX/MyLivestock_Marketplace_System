const multer = require("multer");
const path = require("path");

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB per file
const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024; // 25MB for chat image/video attachments

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const DOCUMENT_MIME_TYPES = [...IMAGE_MIME_TYPES, "application/pdf"];
const CHAT_ATTACHMENT_MIME_TYPES = [...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES];

// Photo-only fields vs. fields that also accept scanned/PDF documents vs.
// chat attachments (which also accept short video clips).
const IMAGE_ONLY_FIELDS = new Set(["profile_image", "image"]);
const CHAT_ATTACHMENT_FIELDS = new Set(["attachment"]);

const fileFilter = (req, file, cb) => {
  let allowedTypes;
  let kind;

  if (CHAT_ATTACHMENT_FIELDS.has(file.fieldname)) {
    allowedTypes = CHAT_ATTACHMENT_MIME_TYPES;
    kind = "an image (JPG, PNG, WEBP, GIF) or video (MP4, WEBM, MOV)";
  } else if (IMAGE_ONLY_FIELDS.has(file.fieldname)) {
    allowedTypes = IMAGE_MIME_TYPES;
    kind = "an image (JPG, PNG, WEBP, or GIF)";
  } else {
    allowedTypes = DOCUMENT_MIME_TYPES;
    kind = "an image (JPG, PNG, WEBP, GIF) or PDF";
  }

  if (!allowedTypes.includes(file.mimetype)) {
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
    // BACKEND_PUBLIC_URL lets this stay correct regardless of which
    // hostname a given request came in on (localhost from this machine's
    // own browser vs. the LAN IP from a phone on the same network) — using
    // req.get("host") here would bake in whichever one the *uploader*
    // happened to use, breaking the image for anyone viewing it from a
    // different host. Falls back to the request's own host when unset, for
    // environments where there's only ever one way in (e.g. production
    // behind a single domain).
    const baseUrl = process.env.BACKEND_PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
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

// Separate instance so chat image/video attachments get a larger size limit
// without loosening it for every other upload (profile photos, documents).
const chatUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_ATTACHMENT_SIZE_BYTES,
  },
});

module.exports = upload;
module.exports.getFileUrl = getFileUrl;
module.exports.isS3Enabled = s3Enabled;
module.exports.chatUpload = chatUpload;
