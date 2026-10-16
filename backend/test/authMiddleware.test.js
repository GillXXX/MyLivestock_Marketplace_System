const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { installFakeDb, tokenFor, fakeRes } = require("./helpers");

const db = installFakeDb();
const protect = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const run = async (middleware, req) => {
  const res = fakeRes();
  let nextCalled = false;
  await middleware(req, res, () => (nextCalled = true));
  return { res, nextCalled };
};

const withToken = (token) => ({ headers: { authorization: `Bearer ${token}` } });

beforeEach(() => db.reset());

test("rejects a request with no token", async () => {
  const { res, nextCalled } = await run(protect, { headers: {} });
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test("rejects a forged or expired token without asking the database", async () => {
  const forged = jwt.sign({ id: 1 }, "someone-elses-secret");
  const expired = jwt.sign({ id: 1 }, process.env.JWT_SECRET, { expiresIn: -10 });

  for (const token of [forged, expired, "not-a-token"]) {
    const { res, nextCalled } = await run(protect, withToken(token));
    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
  }
  assert.equal(db.queries.length, 0);
});

test("rejects a token for an account that no longer exists", async () => {
  db.respond = () => [[]];
  const { res, nextCalled } = await run(protect, withToken(tokenFor({ id: 9, role: "farmer" })));
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test("blocks a deactivated account even with a valid token", async () => {
  db.respond = () => [[{ role: "farmer", is_active: 0 }]];
  const { res, nextCalled } = await run(protect, withToken(tokenFor({ id: 9, role: "farmer" })));
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, "ACCOUNT_DEACTIVATED");
  assert.equal(nextCalled, false);
});

test("uses the role in the database, not the one in the token", async () => {
  db.respond = () => [[{ role: "buyer", is_active: 1 }]];
  const req = withToken(tokenFor({ id: 9, role: "admin" }));
  const { nextCalled } = await run(protect, req);
  assert.equal(nextCalled, true);
  assert.equal(req.user.role, "buyer");
  assert.equal(req.user.id, 9);
});

test("rejects a staff token whose session was signed out", async () => {
  db.respond = (sql) =>
    sql.includes("staff_sessions") ? [[{ logged_out_at: new Date() }]] : [[{ role: "mao_staff", is_active: 1 }]];
  const { res, nextCalled } = await run(protect, withToken(tokenFor({ id: 3, role: "mao_staff", sid: 77 })));
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test("lets a staff token with an open session through", async () => {
  db.respond = (sql) =>
    sql.includes("staff_sessions") ? [[{ logged_out_at: null }]] : [[{ role: "mao_staff", is_active: 1 }]];
  const { nextCalled } = await run(protect, withToken(tokenFor({ id: 3, role: "mao_staff", sid: 77 })));
  assert.equal(nextCalled, true);
});

test("requireRole only lets the listed roles through", async () => {
  const farmerOnly = requireRole("farmer");
  const staffOrAdmin = requireRole("admin", "mao_staff");

  assert.equal((await run(farmerOnly, { user: { role: "farmer" } })).nextCalled, true);
  assert.equal((await run(farmerOnly, { user: { role: "buyer" } })).res.statusCode, 403);
  assert.equal((await run(staffOrAdmin, { user: { role: "mao_staff" } })).nextCalled, true);
  assert.equal((await run(staffOrAdmin, { user: { role: "farmer" } })).res.statusCode, 403);
  assert.equal((await run(farmerOnly, {})).res.statusCode, 403);
});
