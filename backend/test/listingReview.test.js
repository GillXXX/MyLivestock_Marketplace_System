// Buyers see "MAO verified" on an Available listing with a review time
// (reviewed_at). An edit that keeps a listing on the marketplace without
// MAO seeing it again must clear that review, or the badge would vouch for
// content MAO never checked — or for a listing MAO actually rejected.

const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { installFakeDb, fakeRes } = require("./helpers");

const db = installFakeDb();
const { updateListing } = require("../controllers/listingController");

const BODY = {
  livestockType: "Swine",
  category: "livestock",
  unit: "head",
  breed: "Landrace",
  age: "6 months",
  weight: "90",
  price: "9000",
  quantity: "2",
  healthStatus: "Healthy",
  location: "Poblacion",
  description: "",
};

const editListing = async ({ previousStatus, defaultListingStatus }) => {
  db.respond = (sql) => {
    if (sql.includes("FROM livestock_listings WHERE id = ? AND farmer_id = ?")) {
      return [[{ status: previousStatus, documents: '["/uploads/cert.pdf"]', livestock_type: "Swine", unit: "head", price: 9000, weight: 90, image_url: "" }]];
    }
    if (sql.includes("system_settings")) {
      return [[{ default_listing_status: defaultListingStatus, document_verification: 1 }]];
    }
    if (sql.includes("FROM users")) return [[{ full_name: "Juan Dela Cruz" }]];
    if (sql.startsWith("SELECT")) return [[{ n: 0, count: 0 }]];
    return [{ affectedRows: 1, insertId: 1 }];
  };

  const res = fakeRes();
  await updateListing({ user: { id: 10 }, params: { id: "500" }, body: { ...BODY }, files: {} }, res);
  const update = db.queries.find((q) => q.sql.trim().startsWith("UPDATE livestock_listings"));
  return { res, update };
};

beforeEach(() => db.reset());

test("with auto-approval, editing an approved listing clears MAO's review", async () => {
  const { res, update } = await editListing({ previousStatus: "Available", defaultListingStatus: "Auto Approved" });
  assert.equal(res.statusCode, 200);
  assert.ok(update.params.includes("Available"));
  assert.match(update.sql, /reviewed_by = NULL, reviewed_at = NULL/);
});

test("with auto-approval, a fixed rejected listing goes live without MAO's review", async () => {
  const { update } = await editListing({ previousStatus: "Rejected", defaultListingStatus: "Auto Approved" });
  assert.ok(update.params.includes("Available"));
  assert.match(update.sql, /reviewed_at = NULL/);
});

test("with MAO approval on, an edited listing goes back for review and keeps its history", async () => {
  const { update } = await editListing({ previousStatus: "Available", defaultListingStatus: "Pending Approval" });
  assert.ok(update.params.includes("Pending"));
  assert.doesNotMatch(update.sql, /reviewed_at/);
});

test("editing a listing that is waiting for review leaves the review fields alone", async () => {
  const { update } = await editListing({ previousStatus: "Pending", defaultListingStatus: "Pending Approval" });
  assert.ok(update.params.includes("Pending"));
  assert.doesNotMatch(update.sql, /reviewed_at/);
});
