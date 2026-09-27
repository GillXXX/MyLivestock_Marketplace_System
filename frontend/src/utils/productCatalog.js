import { Beef, Bird, PawPrint, Egg, Apple, Carrot, Milk, Droplets, Sprout } from "lucide-react";
import PigNoseIcon from "../components/PigNoseIcon";
import cattlePhoto from "../assets/livestock/cattle.jpg";
import goatPhoto from "../assets/livestock/goat.jpg";
import poultryPhoto from "../assets/livestock/poultry.jpg";
import swinePhoto from "../assets/livestock/swine.jpg";

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

// Neutral placeholder for farm products with no photo (a sprout on the
// brand's soft green) — a cow photo on an egg listing looks wrong.
const PRODUCT_PLACEHOLDER_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#eaf5ef"/>
        <stop offset="1" stop-color="#d4e8dc"/>
      </linearGradient>
    </defs>
    <rect width="400" height="300" fill="url(#g)"/>
    <g transform="translate(152 102) scale(4)" fill="none" stroke="#0f3d2e" stroke-opacity="0.45"
       stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M7 20h10"/>
      <path d="M10 20c5.5-2.5.8-6.4 3-10"/>
      <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/>
      <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>
    </g>
  </svg>
`;

const PRODUCT_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(PRODUCT_PLACEHOLDER_SVG)}`;

// Image to show when a listing has no photo, matched to what's being sold.
export function getListingPlaceholder(type, category) {
  if (type === "Swine") return swinePhoto;
  if (type === "Goat") return goatPhoto;
  if (type === "Poultry" || type === "Duck") return poultryPhoto;
  if (getCategory(type, category) === "product") return PRODUCT_PLACEHOLDER;
  return cattlePhoto; // Cattle, Carabao, and custom animals
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
