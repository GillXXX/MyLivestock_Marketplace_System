import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import "./AdminStatCard.css";

// Shared "high-end tech" stat/KPI card used across every admin page's top
// grid (Dashboard, Users, Listings, Verification, Transactions,
// Notifications, Map Monitoring, Reports) so they all read as one
// consistent design instead of each page having its own bespoke card.
// `delta` (optional): { current, previous, pct } — same shape/badge as the
// Dashboard's KPI cards, for period-over-period comparison.
function AdminStatCard({ icon, value, label, note, accent = "green", delta }) {
  return (
    <div className={`admin-stat-card accent-${accent}`}>
      <div className="admin-stat-top">
        <div className="admin-stat-icon">{icon}</div>
        <DeltaBadge delta={delta} />
      </div>

      <h2>{value}</h2>
      <p>{label}</p>
      {note && <small>{note}</small>}
    </div>
  );
}

function DeltaBadge({ delta }) {
  if (!delta) return null;
  const { pct, current, previous } = delta;

  if (pct === null) {
    return current > 0 ? (
      <span className="kpi-delta up">
        <ArrowUpRight size={12} /> New
      </span>
    ) : null;
  }

  if (pct === 0 && current === 0 && previous === 0) return null;

  const isUp = pct >= 0;

  return (
    <span className={`kpi-delta ${isUp ? "up" : "down"}`}>
      {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(pct)}%
    </span>
  );
}

export default AdminStatCard;
