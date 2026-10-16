const { test } = require("node:test");
const assert = require("node:assert/strict");
require("./helpers"); // sets JWT_SECRET, which both modules sign with
const { approximateFarmLocation, applyFarmLocationPrivacy } = require("../utils/locationPrivacy");
const { isValidSignedRequest, withSignedUrls, PRIVATE_FILENAME } = require("../utils/privateFiles");

// Great-circle distance in metres.
const distanceM = (a, b) => {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
};

const FARM = { lat: 7.9891, lng: 125.9921 }; // Veruela

test("buyers see a farm pin moved 200–500 m from the real spot", () => {
  for (let farmerId = 1; farmerId <= 50; farmerId++) {
    const shown = approximateFarmLocation(FARM.lat, FARM.lng, farmerId);
    const moved = distanceM(FARM, shown);
    assert.ok(moved >= 195 && moved <= 505, `farmer ${farmerId} moved ${moved.toFixed(0)} m`);
  }
});

test("the moved pin is the same every time, so it can't be averaged back", () => {
  assert.deepEqual(approximateFarmLocation(FARM.lat, FARM.lng, 7), approximateFarmLocation(FARM.lat, FARM.lng, 7));
  assert.notDeepEqual(approximateFarmLocation(FARM.lat, FARM.lng, 7), approximateFarmLocation(FARM.lat, FARM.lng, 8));
});

test("a buyer with an agreed deal gets the exact pin", () => {
  const row = { farmer_id: 7, farm_lat: FARM.lat, farm_lng: FARM.lng };

  const exact = applyFarmLocationPrivacy(row, "farmer_id", new Set([7]));
  assert.equal(exact.farm_lat, FARM.lat);
  assert.equal(exact.farm_location_approximate, false);

  const approx = applyFarmLocationPrivacy(row, "farmer_id", new Set());
  assert.notEqual(approx.farm_lat, FARM.lat);
  assert.equal(approx.farm_location_approximate, true);
});

test("private document links work until they expire, and can't be altered", () => {
  const signed = JSON.parse(withSignedUrls(JSON.stringify([{ type: "Government ID", file: "upload-1-abc.pdf" }])));
  const url = new URL(signed[0].url, "http://localhost");
  const filename = url.pathname.split("/").pop();
  const expires = url.searchParams.get("expires");
  const sig = url.searchParams.get("sig");

  assert.equal(isValidSignedRequest(filename, expires, sig), true);
  assert.equal(isValidSignedRequest("upload-2-other.pdf", expires, sig), false);
  assert.equal(isValidSignedRequest(filename, String(Number(expires) + 3600), sig), false);
  assert.equal(isValidSignedRequest(filename, expires, "0".repeat(sig.length)), false);

  const lifetime = Number(expires) - Math.floor(Date.now() / 1000);
  assert.ok(lifetime > 0 && lifetime <= 2 * 60 * 60);
});

test("an expired private document link is refused", () => {
  const crypto = require("crypto");
  const past = String(Math.floor(Date.now() / 1000) - 1);
  const sig = crypto.createHmac("sha256", process.env.JWT_SECRET).update(`upload-1-abc.pdf:${past}`).digest("hex");
  assert.equal(isValidSignedRequest("upload-1-abc.pdf", past, sig), false);
});

test("private file names can't reach outside the private folder", () => {
  assert.equal(PRIVATE_FILENAME.test("upload-1-abc.pdf"), true);
  assert.equal(PRIVATE_FILENAME.test("../.env"), false);
  assert.equal(PRIVATE_FILENAME.test("upload-1/../../x.pdf"), false);
  assert.equal(PRIVATE_FILENAME.test("upload-1-abc.html"), false);
});
