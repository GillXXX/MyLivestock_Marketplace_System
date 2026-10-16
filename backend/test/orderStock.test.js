const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { installFakeDb } = require("./helpers");

const db = installFakeDb();
const { closeOrderAndReturnStock, freeCancelCondition } = require("../utils/orderStock");

const order = { id: 42, listing_id: 500, quantity: 3 };

beforeEach(() => db.reset());

test("closing a pending order returns its stock to the listing in one transaction", async () => {
  db.respond = (sql) => [{ affectedRows: 1 }];

  const closed = await closeOrderAndReturnStock(order, "Cancelled");
  assert.equal(closed, true);

  const [close, restock] = db.queries;
  assert.match(close.sql, /UPDATE transactions SET \? WHERE id = \? AND status = 'Pending'/);
  assert.deepEqual(close.params, [{ status: "Cancelled" }, 42]);
  assert.match(restock.sql, /quantity = quantity \+ \?/);
  assert.deepEqual(restock.params, [3, 500]);
  assert.deepEqual(db.steps, ["begin", "commit", "release"]);
});

test("an order that is no longer pending returns no stock (no double refund)", async () => {
  db.respond = () => [{ affectedRows: 0 }];

  const closed = await closeOrderAndReturnStock(order, "Declined");
  assert.equal(closed, false);
  assert.equal(db.queries.length, 1);
  assert.deepEqual(db.steps, ["begin", "rollback", "release"]);
});

test("a database failure rolls the whole step back", async () => {
  db.respond = (sql) => {
    if (sql.includes("livestock_listings")) throw new Error("connection lost");
    return [{ affectedRows: 1 }];
  };

  await assert.rejects(closeOrderAndReturnStock(order, "Cancelled"), /connection lost/);
  assert.deepEqual(db.steps, ["begin", "rollback", "release"]);
});

test("approving a cancellation only applies to a still-open request", async () => {
  db.respond = () => [{ affectedRows: 1 }];

  await closeOrderAndReturnStock(order, "Cancelled", { onlyIf: "openCancelRequest" });
  assert.match(db.queries[0].sql, /cancel_requested_at IS NOT NULL AND cancel_outcome IS NULL/);
});

test("free cancellation covers Inquiry, or Negotiation within the first hour", () => {
  assert.equal(
    freeCancelCondition("t."),
    "(t.workflow_step = 'Inquiry' OR (t.workflow_step = 'Negotiation' AND t.created_at > NOW() - INTERVAL 1 HOUR))"
  );
});
