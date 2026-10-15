// Deal terms: what a buyer and seller agree on during Negotiation.
// Mirrors frontend/src/utils/dealTerms.js — keep both in sync.

const PAYMENT_OPTIONS = ["Cash on pickup", "Down payment, balance on pickup", "Bank / GCash transfer"];

// What a deal comes to at a given price per unit of the listing's pricing
// basis. Sold by live weight, it's price per kg times the actual weight
// once the animals have been weighed, and an estimate from the listing's
// average weight per head until then.
function computeDealAmount({ unit, unitPrice, quantity, listingWeight, actualWeightKg }) {
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

module.exports = { PAYMENT_OPTIONS, computeDealAmount };
