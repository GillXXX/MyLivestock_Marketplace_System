import { priceBasis, peso, formatDealDate } from "../utils/dealTerms";
import "./DealTermsSummary.css";

// One-line summary of a deal's negotiated terms for the transaction lists:
// the agreed price and pickup, an offer still on the table, the weight
// recorded at pickup, and what it was worth at the listed price.
function DealTermsSummary({ transaction: t }) {
  const basis = priceBasis(t.unit);
  const isLiveWeight = t.unit === "kg_live";
  const weighed = Number(t.actual_weight_kg) > 0;
  const parts = [];

  if (t.terms_agreed_at) {
    parts.push(`Agreed ${peso(t.offer_unit_price)}/${basis}`);
    if (t.offer_pickup_date) parts.push(`Pickup ${formatDealDate(t.offer_pickup_date)}`);
  } else if (t.offer_by && t.status === "Pending") {
    parts.push(`Offer ${peso(t.offer_unit_price)}/${basis} pending`);
  }

  if (isLiveWeight) {
    if (weighed) parts.push(`Weighed ${Number(t.actual_weight_kg).toLocaleString()} kg`);
    else if (t.status === "Pending") parts.push("Estimate until weighed");
  }

  if (t.listed_amount && Number(t.listed_amount) !== Number(t.amount)) {
    parts.push(`Listed ${peso(t.listed_amount)}`);
  }

  if (parts.length === 0) return null;

  return <small className="deal-terms-summary">{parts.join(" · ")}</small>;
}

export default DealTermsSummary;
