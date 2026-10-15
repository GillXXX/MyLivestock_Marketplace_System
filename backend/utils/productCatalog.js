// What farmers can post. Listings are either live animals ("livestock",
// which need a barangay health certificate for MAO review) or backyard
// farm products ("product", documents optional). Farmers can also pick
// "Other" and type their own name, choosing which of the two it is —
// that choice is stored in livestock_listings.category.
// Mirrors frontend/src/utils/productCatalog.js — keep both in sync.

const LIVESTOCK_TYPES = ["Swine", "Cattle", "Goat", "Poultry", "Carabao", "Duck"];

const FARM_PRODUCT_TYPES = ["Eggs", "Fruits", "Vegetables", "Milk / Dairy", "Honey"];

// "kg_live" is how live animals are really sold by weight: the price is
// per kilo of live weight, but the animals are still counted (and
// ordered) by head — nobody buys half a pig. Plain "kg" is for farm
// products; older livestock listings may still carry it.
const UNIT_VALUES = ["head", "kg_live", "kg", "tray", "dozen", "piece", "bundle", "liter", "bottle", "sack"];

const LIVESTOCK_UNIT_VALUES = ["head", "kg_live"];

const PRODUCT_UNIT_VALUES = UNIT_VALUES.filter((u) => u !== "kg_live");

// Known types decide their own category; a custom ("Other") type uses the
// category the farmer chose. Old listings have no category and were all
// livestock, hence the default.
function getCategory(type, category) {
  if (LIVESTOCK_TYPES.includes(type)) return "livestock";
  if (FARM_PRODUCT_TYPES.includes(type)) return "product";
  return category === "product" ? "product" : "livestock";
}

function isValidUnit(unit, category) {
  return (category === "livestock" ? LIVESTOCK_UNIT_VALUES : PRODUCT_UNIT_VALUES).includes(unit);
}

// What one unit of quantity costs. For live weight that's the price per
// kilo times the listing's average weight per head — an estimate until
// the animals are actually weighed at pickup.
function getPricePerQuantityUnit(listing) {
  if (listing.unit === "kg_live") {
    return Number(listing.price) * (parseFloat(listing.weight) || 0);
  }
  return Number(listing.price);
}

module.exports = {
  LIVESTOCK_TYPES,
  FARM_PRODUCT_TYPES,
  UNIT_VALUES,
  getCategory,
  isValidUnit,
  getPricePerQuantityUnit,
};
