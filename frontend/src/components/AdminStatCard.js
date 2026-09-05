import "./AdminStatCard.css";

// Shared "high-end tech" stat/KPI card used across every admin page's top
// grid (Dashboard, Users, Listings, Verification, Transactions,
// Notifications, Map Monitoring, Reports) so they all read as one
// consistent design instead of each page having its own bespoke card.
function AdminStatCard({ icon, value, label, note, accent = "green" }) {
  return (
    <div className={`admin-stat-card accent-${accent}`}>
      <div className="admin-stat-top">
        <div className="admin-stat-icon">{icon}</div>
      </div>

      <h2>{value}</h2>
      <p>{label}</p>
      {note && <small>{note}</small>}
    </div>
  );
}

export default AdminStatCard;
