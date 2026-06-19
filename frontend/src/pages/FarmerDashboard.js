import { useState, useEffect } from "react";

import {
  Bell,
  Menu,
  X,
  Home,
  List,
  PlusCircle,
  MessageCircle,
  User,
  LogOut,
  TrendingUp,
  CheckCircle,
  ClipboardList,
  Search,
  ArrowUpRight,
  Clock,
  BadgeCheck,
  MapPin,
  Wallet,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import "./FarmerDashboard.css";

function FarmerDashboard() {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const res = await fetch("http://localhost:5000/api/farmer/dashboard", {
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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (loading) {
    return <h2 style={{ padding: "30px" }}>Loading farmer dashboard...</h2>;
  }

  if (error) {
    return <h2 style={{ padding: "30px", color: "red" }}>{error}</h2>;
  }

  const userName = dashboardData?.user?.full_name || "Farmer";
  const firstLetter = userName.charAt(0).toUpperCase();

  return (
    <div className="farmer-shell">
      <aside className={sidebarOpen ? "farmer-sidebar" : "farmer-sidebar collapsed"}>
        <div className="farmer-brand">
          <div className="farmer-logo">🐮</div>

          {sidebarOpen && (
            <div>
              <h3>HerdMarket</h3>
              <p>Farmer Portal</p>
            </div>
          )}
        </div>

        <nav className="farmer-nav">
          <Link className="active" to="/farmer-dashboard">
            <Home size={20} />
            <span>Dashboard</span>
          </Link>

          <Link to="/listings">
            <List size={20} />
            <span>My Listings</span>
          </Link>

          <Link to="/post">
            <PlusCircle size={20} />
            <span>Post Livestock</span>
          </Link>

          <Link to="/messages">
            <MessageCircle size={20} />
            <span>Messages</span>
          </Link>

          <Link to="/profile">
            <User size={20} />
            <span>Profile</span>
          </Link>
        </nav>

        <div className="sidebar-status">
          <p>Account Status</p>
          <strong>Verified Farmer</strong>
          <span>MAO approved</span>
        </div>

        <button className="farmer-logout" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </aside>

      <main className="farmer-main">
        <header className="farmer-topbar">
          <div className="topbar-left">
            <button
              className="menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            <div>
              <span className="eyebrow">Farmer Dashboard</span>
              <h1>Welcome back, {userName}</h1>
              <p>Manage your livestock listings, inquiries, and transactions.</p>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="dashboard-search">
              <Search size={18} />
              <input type="text" placeholder="Search listings, buyers..." />
            </div>

            <div className="notification-wrapper">
              <button
                className="notification-btn"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={22} />
                <i></i>
              </button>

              {showNotifications && (
                <div className="notification-dropdown">
                  <h4>Notifications</h4>

                  {dashboardData.activities.length === 0 ? (
                    <div className="notification-item">
                      <strong>No notifications</strong>
                      <p>No recent activity yet.</p>
                    </div>
                  ) : (
                    dashboardData.activities.slice(0, 3).map((item, index) => (
                      <div
                        className={index === 0 ? "notification-item unread" : "notification-item"}
                        key={index}
                      >
                        <strong>{item.title}</strong>
                        <p>{item.text}</p>
                        <small>Recently</small>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

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

              <Link className="secondary" to="/messages">
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
          />

          <KpiCard
            icon={<MessageCircle />}
            value={dashboardData.stats.buyerInquiries}
            label="Buyer Inquiries"
            note="Total inquiries"
          />

          <KpiCard
            icon={<CheckCircle />}
            value={dashboardData.stats.completedSales}
            label="Completed Sales"
            note="Recorded transactions"
          />

          <KpiCard
            icon={<Wallet />}
            value={`₱${Number(dashboardData.stats.tradeValue).toLocaleString()}`}
            label="Trade Value"
            note="Estimated total"
          />
        </section>

        <section className="dashboard-grid">
          <div className="dashboard-card wide">
            <div className="card-header">
              <div>
                <h3>Recent Activity</h3>
                <p>Latest updates from your marketplace transactions.</p>
              </div>

              <button>View all</button>
            </div>

            {dashboardData.activities.length === 0 ? (
              <p>No recent activity yet.</p>
            ) : (
              dashboardData.activities.map((item, index) => (
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

        <section className="dashboard-grid bottom">
          <div className="dashboard-card">
            <div className="card-header">
              <div>
                <h3>Trading Workflow</h3>
                <p>Your current transaction progress.</p>
              </div>
            </div>

            {dashboardData.workflows.length === 0 ? (
              <p>No active transaction workflow yet.</p>
            ) : (
              dashboardData.workflows.map((item, index) => (
                <WorkflowItem
                  key={index}
                  livestock={item.livestock_type}
                  buyer={item.buyer_name}
                  step={item.workflow_step}
                />
              ))
            )}
          </div>

          <div className="dashboard-card">
            <div className="card-header">
              <div>
                <h3>Farm Location</h3>
                <p>Seller visibility for buyer inspection.</p>
              </div>

              <MapPin size={22} />
            </div>

            <div className="mini-map">
              <div className="map-pin"></div>

              <div className="map-label">
                <strong>
                  {dashboardData.user.farm_location ||
                    dashboardData.user.location ||
                    "Veruela, Agusan del Sur"}
                </strong>
                <p>Farm location visible to buyers</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function KpiCard({ icon, value, label, note }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon">{icon}</div>
      <h2>{value}</h2>
      <p>{label}</p>
      <small>{note}</small>
    </div>
  );
}

function ActivityItem({ icon, title, text, time }) {
  return (
    <div className="activity-row">
      <div className="activity-left">
        <div className="activity-icon">{icon}</div>

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

function WorkflowItem({ livestock, buyer, step }) {
  return (
    <div className="workflow-item">
      <div>
        <strong>{livestock}</strong>
        <p>Buyer: {buyer}</p>
      </div>

      <div>
        <Workflow step={step} />
        <span>{step}</span>
      </div>
    </div>
  );
}

function Workflow({ step }) {
  const steps = ["Inquiry", "Negotiation", "Verification", "Confirmation", "Completed"];
  const activeIndex = steps.indexOf(step);

  return (
    <div className="workflow-line">
      {steps.map((item, index) => (
        <i
          key={item}
          className={
            index < activeIndex
              ? "done"
              : index === activeIndex
              ? "active"
              : ""
          }
        ></i>
      ))}
    </div>
  );
}

export default FarmerDashboard;