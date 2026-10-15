// Deal terms: what a buyer and seller agree on during Negotiation.
// Mirrors backend/utils/dealTerms.js — keep both in sync.

export const PAYMENT_OPTIONS = ["Cash on pickup", "Down payment, balance on pickup", "Bank / GCash transfer"];

// What a deal comes to at a given price per unit of the listing's pricing
// basis. Sold by live weight, it's price per kg times the actual weight
// once the animals have been weighed, and an estimate from the listing's
// average weight per head until then.
export function computeDealAmount({ unit, unitPrice, quantity, listingWeight, actualWeightKg }) {
  const price = Number(unitPrice) || 0;
  let total;

  if (unit === "kg_live") {
    const actual = Number(actualWeightKg);
    total = actual > 0 ? price * actual : price * (parseFloat(listingWeight) || 0) * (Number(quantity) || 0);
  } else {
    total = price * (Number(quantity) || 0);
  }

  return Math.round(total * 100) / 100;
}

// What the price is per: "kg" for live weight, otherwise the unit itself.
export function priceBasis(unit) {
  return unit === "kg_live" ? "kg" : unit || "head";
}

export function peso(n) {
  return `₱${Number(n).toLocaleString()}`;
}

// "Oct 20, 2026"
export function formatDealDate(date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

// "YYYY-MM-DD" in local time, for <input type="date">.
export function toDateInputValue(date) {
  const d = date ? new Date(date) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
