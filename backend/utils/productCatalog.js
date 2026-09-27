// What farmers can post. Listings are either live animals ("livestock",
// which need a barangay health certificate for MAO review) or backyard
// farm products ("product", documents optional). Farmers can also pick
// "Other" and type their own name, choosing which of the two it is —
// that choice is stored in livestock_listings.category.
// Mirrors frontend/src/utils/productCatalog.js — keep both in sync.

const LIVESTOCK_TYPES = ["Swine", "Cattle", "Goat", "Poultry", "Carabao", "Duck"];

const FARM_PRODUCT_TYPES = ["Eggs", "Fruits", "Vegetables", "Milk / Dairy", "Honey"];

const UNIT_VALUES = ["head", "kg", "tray", "dozen", "piece", "bundle", "liter", "bottle", "sack"];

// Known types decide their own category; a custom ("Other") type uses the
// category the farmer chose. Old listings have no category and were all
// livestock, hence the default.
function getCategory(type, category) {
  if (LIVESTOCK_TYPES.includes(type)) return "livestock";
  if (FARM_PRODUCT_TYPES.includes(type)) return "product";
  return category === "product" ? "product" : "livestock";
}

function isValidUnit(unit) {
  return UNIT_VALUES.includes(unit);
}

module.exports = {
  LIVESTOCK_TYPES,
  FARM_PRODUCT_TYPES,
  UNIT_VALUES,
  getCategory,
  isValidUnit,
};
