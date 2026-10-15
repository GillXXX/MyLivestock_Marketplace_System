// One-time move of farmers' existing verification documents (government
// ID, barangay certificate) out of the public uploads/ folder into
// uploads-private/, where they're only reachable through signed links.
// Safe to run more than once: documents already moved are skipped.
//
//   cd backend && node scripts/makeVerificationDocsPrivate.js
//
// Each file is copied first, the user's record updated, and only then is
// the public copy deleted — unless something else (a listing, a profile
// photo) still points at the same file, in which case it's left in place.
// Not needed with S3 storage.

require("dotenv").config();
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const db = require("../config/db");
const { PRIVATE_UPLOAD_DIR } = require("../utils/privateFiles");

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf"]);

const isReferencedElsewhere = async (name) => {
  const like = `%/uploads/${name}%`;
  const [[row]] = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM livestock_listings WHERE documents LIKE ? OR image_url LIKE ?) +
       (SELECT COUNT(*) FROM users WHERE profile_image LIKE ?) +
       (SELECT COUNT(*) FROM messages WHERE attachment_url LIKE ?) AS n`,
    [like, like, like, like]
  );
  return Number(row.n) > 0;
};

(async () => {
  fs.mkdirSync(PRIVATE_UPLOAD_DIR, { recursive: true });

  const [users] = await db.query("SELECT id, verification_document FROM users WHERE verification_document IS NOT NULL");
  let moved = 0;
  let skipped = 0;

  for (const user of users) {
    let docs;
    try {
      docs = JSON.parse(user.verification_document);
    } catch (error) {
      console.log(`user ${user.id}: unreadable verification_document, skipped`);
      skipped += 1;
      continue;
    }
    if (!Array.isArray(docs)) continue;

    const toDelete = [];
    let changed = false;

    const updated = [];
    for (const doc of docs) {
      const name = doc.url && String(doc.url).split("/uploads/")[1];
      const source = name && path.join("uploads", path.basename(name));
      let extension = name ? path.extname(name).toLowerCase() : "";

      if (doc.file || !source || !fs.existsSync(source) || !ALLOWED_EXTENSIONS.has(extension)) {
        if (!doc.file) {
          console.log(`user ${user.id}: ${doc.type} left as is (${doc.url || "no url"})`);
          skipped += 1;
        }
        updated.push(doc);
        continue;
      }

      if (extension === ".jpeg") extension = ".jpg";
      const privateName = `upload-${Date.now()}-${crypto.randomUUID()}${extension}`;
      fs.copyFileSync(source, path.join(PRIVATE_UPLOAD_DIR, privateName));
      updated.push({ type: doc.type, file: privateName });
      toDelete.push(path.basename(name));
      changed = true;
    }

    if (!changed) continue;

    await db.query("UPDATE users SET verification_document = ? WHERE id = ?", [JSON.stringify(updated), user.id]);

    for (const name of toDelete) {
      if (await isReferencedElsewhere(name)) {
        console.log(`user ${user.id}: kept public copy of ${name} (still used elsewhere)`);
      } else {
        fs.unlinkSync(path.join("uploads", name));
      }
      moved += 1;
    }
    console.log(`user ${user.id}: ${toDelete.length} document(s) made private`);
  }

  console.log(`Done. ${moved} moved, ${skipped} left as is.`);
  await db.end();
})().catch(async (error) => {
  console.error("Failed:", error.message);
  process.exit(1);
});
