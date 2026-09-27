import { Beef, Bird, PawPrint, Egg, Apple, Carrot, Milk, Droplets, Sprout } from "lucide-react";
import PigNoseIcon from "../components/PigNoseIcon";

// What farmers can post. Listings are either live animals ("livestock",
// which need a barangay health certificate for MAO review) or backyard
// farm products ("product", documents optional). Farmers can also pick
// "Other" and type their own name, choosing which of the two it is —
// that choice is stored in livestock_listings.category.
// Mirrors backend/utils/productCatalog.js — keep both in sync.

export const LIVESTOCK_TYPES = ["Swine", "Cattle", "Goat", "Poultry", "Carabao", "Duck"];

export const FARM_PRODUCT_TYPES = ["Eggs", "Fruits", "Vegetables", "Milk / Dairy", "Honey"];

export const ALL_KNOWN_TYPES = [...LIVESTOCK_TYPES, ...FARM_PRODUCT_TYPES];

export const OTHER_LIVESTOCK = "__other_livestock__";
export const OTHER_PRODUCT = "__other_product__";

export const UNITS = [
  { value: "head", label: "per head", plural: "head" },
  { value: "kg", label: "per kilo", plural: "kg" },
  { value: "tray", label: "per tray", plural: "trays" },
  { value: "dozen", label: "per dozen", plural: "dozen" },
  { value: "piece", label: "per piece", plural: "pieces" },
  { value: "bundle", label: "per bundle", plural: "bundles" },
  { value: "liter", label: "per liter", plural: "liters" },
  { value: "bottle", label: "per bottle", plural: "bottles" },
  { value: "sack", label: "per sack", plural: "sacks" },
];

const DEFAULT_UNITS = {
  Eggs: "tray",
  Fruits: "kg",
  Vegetables: "kg",
  "Milk / Dairy": "liter",
  Honey: "bottle",
};

// Sensible starting unit when a farmer picks a type (they can change it).
export function defaultUnitFor(type, category) {
  if (DEFAULT_UNITS[type]) return DEFAULT_UNITS[type];
  return getCategory(type, category) === "product" ? "kg" : "head";
}

// Known types decide their own category; a custom ("Other") type uses the
// category saved with the listing. Old listings have no category and were
// all livestock, hence the default.
export function getCategory(type, category) {
  if (LIVESTOCK_TYPES.includes(type)) return "livestock";
  if (FARM_PRODUCT_TYPES.includes(type)) return "product";
  return category === "product" ? "product" : "livestock";
}

export function isLivestock(type, category) {
  return getCategory(type, category) === "livestock";
}

export function getProductIcon(type, category) {
  if (type === "Swine") return PigNoseIcon;
  if (type === "Cattle" || type === "Carabao") return Beef;
  if (type === "Poultry" || type === "Duck") return Bird;
  if (type === "Eggs") return Egg;
  if (type === "Fruits") return Apple;
  if (type === "Vegetables") return Carrot;
  if (type === "Milk / Dairy") return Milk;
  if (type === "Honey") return Droplets;
  return getCategory(type, category) === "product" ? Sprout : PawPrint;
}

function findUnit(unit) {
  return UNITS.find((u) => u.value === unit) || UNITS[0];
}

// "₱180 / tray"
export function formatPrice(price, unit) {
  return `₱${Number(price).toLocaleString()} / ${findUnit(unit).value}`;
}

// "3 trays", "1 tray", "12 head"
export function formatQuantity(quantity, unit) {
  const u = findUnit(unit);
  const n = Number(quantity) || 0;
  return `${n} ${n === 1 ? u.value : u.plural}`;
}
