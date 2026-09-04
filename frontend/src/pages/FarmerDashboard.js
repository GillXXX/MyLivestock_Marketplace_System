import { useState, useEffect } from "react";

import {
  MessageCircle,
  TrendingUp,
  CheckCircle,
  ClipboardList,
  ArrowUpRight,
  Clock,
  BadgeCheck,
  Wallet,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import NotificationBell from "../components/NotificationBell";
import { API_URL } from "../config";
import "./FarmerDashboard.css";

function FarmerDashboard() {
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAllActivities, setShowAllActivities] = useState(false);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const res = await fetch(`${API_URL}/api/farmer/dashboard`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          navigate("/login");
          return;
        }

        if (data.user.role !== "farmer") {
          navigate("/buyer-dashboard");
          return;
        }

        setDashboardData(data);
        setLoading(false);
      } catch (error) {
        setError("Cannot connect to backend server");
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [navigate]);

  if (loading) {
    return <h2 style={{ padding: "30px" }}>Loading farmer dashboard...</h2>;
  }

  if (error) {
    return <h2 style={{ padding: "30px", color: "red" }}>{error}</h2>;
  }

  const userName = dashboardData?.user?.full_name || "Farmer";
  const firstLetter = userName.charAt(0).toUpperCase();

  return (
    <>
      <main className="farmer-main">
        <header className="farmer-topbar">
          <div className="topbar-left">
            <div>
              <span className="eyebrow">Farmer Dashboard</span>
              <h1>Welcome back, {userName}</h1>
              <p>Manage your livestock listings, inquiries, and transactions.</p>
            </div>
          </div>

          <div className="topbar-actions">
            <NotificationBell role="farmer" />

            <div className="farmer-profile-chip">
              <div className="profile-avatar">{firstLetter}</div>

              <div>
                <strong>{userName}</strong>
                <p>Verified Farmer</p>
              </div>
            </div>
          </div>
        </header>

        <section className="farmer-hero-card">
          <TrendingUp className="hero-watermark" />

          <div>
            <span>Marketplace Performance</span>
            <h2>Your herd is gaining more buyer attention this week.</h2>
            <p>
              You received {dashboardData.stats.buyerInquiries} buyer inquiries.
              Keep your livestock listings updated to improve buyer trust and visibility.
            </p>

            <div className="hero-actions">
              <Link to="/post">
                Post New Livestock
                <ArrowUpRight size={18} />
              </Link>

              <Link className="secondary" to="/farmer-messages">
                View Messages
              </Link>
            </div>
          </div>

          <div className="hero-metric">
            <strong>{dashboardData.stats.buyerInquiries}</strong>
            <span>Buyer inquiries</span>
          </div>
        </section>

        <section className="kpi-grid">
          <KpiCard
            icon={<TrendingUp />}
            value={dashboardData.stats.activeListings}
            label="Active Listings"
            note="Current active posts"
            tone="green"
          />

          <KpiCard
            icon={<MessageCircle />}
            value={dashboardData.stats.buyerInquiries}
            label="Buyer Inquiries"
            note="Total inquiries"
            tone="gold"
          />

          <KpiCard
            icon={<CheckCircle />}
            value={dashboardData.stats.completedSales}
            label="Completed Sales"
            note="Recorded transactions"
            tone="teal"
          />

          <KpiCard
            icon={<Wallet />}
            value={`₱${Number(dashboardData.stats.tradeValue).toLocaleString()}`}
            label="Trade Value"
            note="Estimated total"
            tone="terracotta"
          />
        </section>

        <section className="dashboard-grid">
          <div className="dashboard-card wide">
            <div className="card-header">
              <div>
                <h3>Recent Activity</h3>
                <p>Latest updates from your marketplace transactions.</p>
              </div>

              {dashboardData.activities.length > 5 && (
                <button onClick={() => setShowAllActivities(!showAllActivities)}>
                  {showAllActivities ? "Show less" : "View all"}
                </button>
              )}
            </div>

            {dashboardData.activities.length === 0 ? (
              <p>No recent activity yet.</p>
            ) : (
              (showAllActivities
                ? dashboardData.activities
                : dashboardData.activities.slice(0, 5)
              ).map((item, index) => (
                <ActivityItem
                  key={index}
                  icon={
                    index === 0 ? (
                      <ClipboardList />
                    ) : index === 1 ? (
                      <BadgeCheck />
                    ) : (
                      <Clock />
                    )
                  }
                  tone={["green", "gold", "teal"][index % 3]}
                  title={item.title}
                  text={item.text}
                  time="Recently"
                />
              ))
            )}
          </div>

          <div className="dashboard-card">
            <div className="card-header">
              <div>
                <h3>My Livestock Listings</h3>
                <p>Current listing status overview.</p>
              </div>
            </div>

            {dashboardData.listings.length === 0 ? (
              <p>No livestock listings yet.</p>
            ) : (
              dashboardData.listings.map((item) => (
                <ListingItem
                  key={item.id}
                  name={item.livestock_type}
                  detail={`${item.breed || "No breed"} • ₱${Number(item.price).toLocaleString()}`}
                  status={item.status}
                />
              ))
            )}
          </div>
        </section>
      </main>
    </>
  );
}

function KpiCard({ icon, value, label, note, tone = "green" }) {
  return (
    <div className={`kpi-card tone-${tone}`}>
      <div className="kpi-icon">{icon}</div>
      <h2>{value}</h2>
      <p>{label}</p>
      <small>{note}</small>
    </div>
  );
}

function ActivityItem({ icon, title, text, time, tone = "green" }) {
  return (
    <div className="activity-row">
      <div className="activity-left">
        <div className={`activity-icon tone-${tone}`}>{icon}</div>

        <div className="activity-content">
          <strong>{title}</strong>
          <p>{text}</p>
        </div>
      </div>

      <span className="activity-time">{time}</span>
    </div>
  );
}

function ListingItem({ name, detail, status }) {
  return (
    <div className="listing-row">
      <div>
        <strong>{name}</strong>
        <p>{detail}</p>
      </div>

      <span className={status === "Available" ? "status available" : "status pending"}>
        {status}
      </span>
    </div>
  );
}

export default FarmerDashboard;