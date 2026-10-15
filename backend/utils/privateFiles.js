const crypto = require("crypto");
const path = require("path");

// Farmers' verification documents (government ID, barangay certificate)
// are kept out of the public /uploads folder. They live in
// uploads-private/, which is never served as-is; a viewer allowed to see
// them gets a signed link that stops working after LINK_TTL_SECONDS, so a
// copied or leaked link is useless once it expires. With S3 storage the
// files stay at their bucket URLs as before.

const PRIVATE_UPLOAD_DIR = "uploads-private";
const LINK_TTL_SECONDS = 2 * 60 * 60;

// Only names this app generates (see generateKey in uploadMiddleware), so
// a request can never reach outside the folder.
const PRIVATE_FILENAME = /^upload-[\w-]+\.(jpg|png|webp|gif|pdf)$/;

const signature = (filename, expires) =>
  crypto.createHmac("sha256", process.env.JWT_SECRET).update(`${filename}:${expires}`).digest("hex");

const signedFileUrl = (filename) => {
  const expires = Math.floor(Date.now() / 1000) + LINK_TTL_SECONDS;
  return `/private-files/${filename}?expires=${expires}&sig=${signature(filename, expires)}`;
};

const isValidSignedRequest = (filename, expires, sig) => {
  if (!PRIVATE_FILENAME.test(filename)) return false;
  if (!/^\d+$/.test(String(expires)) || Number(expires) < Math.floor(Date.now() / 1000)) return false;

  const expected = Buffer.from(signature(filename, expires));
  const given = Buffer.from(String(sig || ""));
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
};

const privateFilePath = (filename) => path.resolve(PRIVATE_UPLOAD_DIR, filename);

// How an uploaded verification document is recorded: the private file's
// name, or its public URL when S3 storage is in use.
const storedFileRef = (file, getFileUrl, req) =>
  file.filename && !file.location ? { file: file.filename } : { url: getFileUrl(file, req) };

// The users.verification_document JSON with a fresh signed link for every
// privately stored file, for someone allowed to view them. Older entries
// that still point at a public URL are passed through unchanged.
const withSignedUrls = (verificationDocument) => {
  if (!verificationDocument) return verificationDocument;

  try {
    const docs = JSON.parse(verificationDocument);
    if (!Array.isArray(docs)) return verificationDocument;

    return JSON.stringify(
      docs.map((doc) => (doc.file ? { type: doc.type, url: signedFileUrl(doc.file) } : doc))
    );
  } catch (error) {
    return verificationDocument;
  }
};

module.exports = {
  PRIVATE_UPLOAD_DIR,
  PRIVATE_FILENAME,
  isValidSignedRequest,
  privateFilePath,
  storedFileRef,
  withSignedUrls,
};
