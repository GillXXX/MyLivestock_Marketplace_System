const { test } = require("node:test");
const assert = require("node:assert/strict");
const { computeDealAmount } = require("../utils/dealTerms");
const { getCategory, isValidUnit, getPricePerQuantityUnit } = require("../utils/productCatalog");
const { getDocumentRequirement, formatRequirementMessage } = require("../utils/livestockDocRequirements");

test("deal amount per head is price times quantity", () => {
  assert.equal(computeDealAmount({ unit: "head", unitPrice: 8500, quantity: 3 }), 25500);
});

test("deal amount by live weight uses the listing's average weight until weighed", () => {
  const estimate = computeDealAmount({ unit: "kg_live", unitPrice: 180, quantity: 2, listingWeight: "95" });
  assert.equal(estimate, 180 * 95 * 2);
});

test("deal amount by live weight uses the actual weight once recorded", () => {
  const final = computeDealAmount({ unit: "kg_live", unitPrice: 180, quantity: 2, listingWeight: "95", actualWeightKg: 201.5 });
  assert.equal(final, 36270);
});

test("deal amounts are rounded to centavos", () => {
  assert.equal(computeDealAmount({ unit: "kg", unitPrice: 33.333, quantity: 3 }), 100);
});

test("known types decide their own category; Other uses the farmer's choice", () => {
  assert.equal(getCategory("Swine"), "livestock");
  assert.equal(getCategory("Eggs", "livestock"), "product");
  assert.equal(getCategory("Rabbit", "livestock"), "livestock");
  assert.equal(getCategory("Mushrooms", "product"), "product");
  assert.equal(getCategory("Old listing without category"), "livestock");
});

test("live animals are sold per head or per kg of live weight only", () => {
  assert.equal(isValidUnit("head", "livestock"), true);
  assert.equal(isValidUnit("kg_live", "livestock"), true);
  assert.equal(isValidUnit("tray", "livestock"), false);
  assert.equal(isValidUnit("tray", "product"), true);
  assert.equal(isValidUnit("kg_live", "product"), false);
});

test("price per head for live weight is price per kg times average weight", () => {
  assert.equal(getPricePerQuantityUnit({ unit: "kg_live", price: "180", weight: "95" }), 17100);
  assert.equal(getPricePerQuantityUnit({ unit: "head", price: "8500", weight: "95" }), 8500);
});

test("live animals need a barangay health certificate; farm products don't", () => {
  assert.equal(getDocumentRequirement("Cattle").minDocuments, 1);
  assert.equal(getDocumentRequirement("Eggs"), null);
  assert.equal(getDocumentRequirement("Mushrooms", "product"), null);
  assert.match(formatRequirementMessage("Goat", "livestock"), /Goat listings require the Barangay health certificate/);
});
