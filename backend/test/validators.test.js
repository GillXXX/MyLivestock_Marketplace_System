const { test } = require("node:test");
const assert = require("node:assert/strict");
const { isStrongPassword, isValidPhone, tooLong, pickProfileFields, TEXT_LIMITS } = require("../utils/validators");

test("passwords need 8+ characters with upper, lower and a number", () => {
  assert.equal(isStrongPassword("Farmer2026"), true);
  assert.equal(isStrongPassword("password"), false);
  assert.equal(isStrongPassword("12345678"), false);
  assert.equal(isStrongPassword("Short1"), false);
  assert.equal(isStrongPassword("alllowercase1"), false);
});

test("phone numbers as people type them here", () => {
  assert.equal(isValidPhone("09123456789"), true);
  assert.equal(isValidPhone("+63 912-345-6789"), true);
  assert.equal(isValidPhone("(085) 123 4567"), true);
  assert.equal(isValidPhone("12345"), false);
  assert.equal(isValidPhone("0912abc4567"), false);
  assert.equal(isValidPhone(""), false);
});

test("tooLong names the field and the limit", () => {
  assert.equal(tooLong("a".repeat(TEXT_LIMITS.breed), TEXT_LIMITS.breed, "Breed"), null);
  assert.equal(tooLong("a".repeat(101), 100, "Breed"), "Breed must be 100 characters or fewer");
  assert.equal(tooLong(undefined, 100, "Breed"), null);
});

test("profile saves change only the fields sent", () => {
  const { fields } = pickProfileFields({ phone: " 09123456789 " }, ["phone", "location"]);
  assert.deepEqual(fields, { phone: "09123456789" });
});

test("profile saves refuse a blank name, a bad phone or a bad map pin", () => {
  assert.equal(pickProfileFields({ full_name: "   " }, []).error, "Full name is required");
  assert.match(pickProfileFields({ phone: "123" }, ["phone"]).error, /valid phone/);
  assert.match(pickProfileFields({ farm_lat: "200" }, [], [["farm_lat", 90]]).error, /farm location/);
  assert.deepEqual(pickProfileFields({ farm_lat: "" }, [], [["farm_lat", 90]]).fields, { farm_lat: null });
  assert.deepEqual(pickProfileFields({ farm_lat: "8.07" }, [], [["farm_lat", 90]]).fields, { farm_lat: 8.07 });
});
