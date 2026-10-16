// End-to-end through the real listing routes (auth, role check, rate
// limiter, controller) with a fake database: a farmer can only reach their
// own listings, and other roles can't reach the farmer routes at all.

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { installFakeDb, tokenFor } = require("./helpers");

const db = installFakeDb();
const listingRoutes = require("../routes/listingRoutes");

const OWNER_ID = 10;
const OTHER_FARMER_ID = 11;
const LISTING_ID = 500;

let server;
let baseUrl;

// The fake database knows one listing, owned by OWNER_ID, and answers the
// ownership-scoped queries the way MySQL would.
const respond = (sql, params = []) => {
  if (sql.includes("FROM users WHERE id = ?")) {
    const roles = { [OWNER_ID]: "farmer", [OTHER_FARMER_ID]: "farmer", 20: "buyer", 30: "mao_staff" };
    return [[{ role: roles[params[0]], is_active: 1 }]];
  }
  const owns = Number(params[0]) === LISTING_ID && Number(params[1]) === OWNER_ID;
  if (sql.startsWith("UPDATE livestock_listings SET status = 'Removed'")) {
    return [{ affectedRows: owns ? 1 : 0 }];
  }
  if (sql.startsWith("SELECT * FROM livestock_listings WHERE id = ? AND farmer_id = ?")) {
    return [owns ? [{ id: LISTING_ID, farmer_id: OWNER_ID, livestock_type: "Swine" }] : []];
  }
  if (sql.includes("COUNT(*)")) return [[{ count: 0, total: 0 }]];
  return [[]];
};

const call = (method, path, userId) =>
  fetch(`${baseUrl}${path}`, {
    method,
    headers: { Authorization: `Bearer ${tokenFor({ id: userId })}` },
  });

before(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/listings", listingRoutes);
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

beforeEach(() => {
  db.reset();
  db.respond = respond;
});

test("a farmer cannot remove another farmer's listing", async () => {
  const res = await call("DELETE", `/api/listings/${LISTING_ID}`, OTHER_FARMER_ID);
  assert.equal(res.status, 404);

  const removal = db.queries.find((q) => q.sql.startsWith("UPDATE livestock_listings"));
  assert.deepEqual(removal.params.map(Number), [LISTING_ID, OTHER_FARMER_ID]);
});

test("the owner can remove their own listing", async () => {
  const res = await call("DELETE", `/api/listings/${LISTING_ID}`, OWNER_ID);
  assert.equal(res.status, 200);
});

test("a farmer cannot open another farmer's listing for editing", async () => {
  const res = await call("GET", `/api/listings/${LISTING_ID}`, OTHER_FARMER_ID);
  assert.equal(res.status, 404);
});

test("buyers and MAO staff cannot use the farmer listing routes", async () => {
  for (const userId of [20, 30]) {
    const res = await call("DELETE", `/api/listings/${LISTING_ID}`, userId);
    assert.equal(res.status, 403);
  }
  assert.equal(db.queries.some((q) => q.sql.startsWith("UPDATE")), false);
});

test("an anonymous request is refused", async () => {
  const res = await fetch(`${baseUrl}/api/listings/${LISTING_ID}`, { method: "DELETE" });
  assert.equal(res.status, 401);
});
