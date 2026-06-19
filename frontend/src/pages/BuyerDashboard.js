import { useEffect, useState } from "react";

import {
  Bell,
  Menu,
  X,
  Home,
  Store,
  Heart,
  MessageCircle,
  FileCheck2,
  MapPin,
  User,
  Settings,
  LogOut,
  Search,
  ShoppingBag,
  Clock,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  Eye,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import "./BuyerDashboard.css";

function BuyerDashboard() {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const defaultImage =
    "https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80&w=1400&auto=format&fit=crop";

  useEffect(() => {
    const fetchBuyerDashboard = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const res = await fetch("http://localhost:5000/api/buyer/dashboard", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          setMessage(data.message || "Failed to load buyer dashboard");
          setLoading(false);
          return;
        }

        setDashboardData(data);
        setLoading(false);
      } catch (error) {
        setMessage("Cannot connect to backend server");
        setLoading(false);
      }
    };

    fetchBuyerDashboard();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (loading) {
    return <h2 style={{ padding: "30px" }}>Loading buyer dashboard...</h2>;
  }

  if (message) {
    return <h2 style={{ padding: "30px", color: "red" }}>{message}</h2>;
  }

  const buyerName = dashboardData?.user?.full_name || "Buyer Account";
  const firstLetter = buyerName.charAt(0).toUpperCase();

  return (
    <div className="buyer-shell">
      <aside className={sidebarOpen ? "buyer-sidebar" : "buyer-sidebar collapsed"}>
        <div className="buyer-brand">
          <div className="buyer-logo">🐄</div>

          {sidebarOpen && (
            <div>
              <h3>HerdMarket</h3>
              <p>Buyer Portal</p>
            </div>
          )}
        </div>

        <nav className="buyer-nav">
          <Link className="active" to="/buyer-dashboard">
            <Home size={20} />
            <span>Dashboard</span>
          </Link>

          <Link to="/marketplace">
            <Store size={20} />
            <span>Marketplace</span>
          </Link>

          <Link to="/buyer-favorites">
            <Heart size={20} />
            <span>Saved Listings</span>
          </Link>

          <Link to="/messages">
            <MessageCircle size={20} />
            <span>Messages</span>
          </Link>

          <Link to="/buyer-transactions">
            <FileCheck2 size={20} />
            <span>Transactions</span>
          </Link>

          <Link to="/buyer-map">
            <MapPin size={20} />
            <span>Map Explorer</span>
          </Link>

          <Link to="/buyer-profile">
            <User size={20} />
            <span>Profile</span>
          </Link>

          <Link to="/buyer-settings">
            <Settings size={20} />
            <span>Settings</span>
          </Link>
        </nav>

        <div className="buyer-sidebar-card">
          <p>Buyer Status</p>
          <strong>Verified Buyer</strong>
          <span>Ready to inquire</span>
        </div>

        <button className="buyer-logout" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </aside>

      <main className="buyer-main">
        <header className="buyer-topbar">
          <div className="topbar-left">
            <button
              className="menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            <div>
              <span className="eyebrow">Buyer Dashboard</span>
              <h1>Find livestock with confidence</h1>
              <p>Browse verified listings, contact farmers, and track inquiries.</p>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="buyer-search">
              <Search size={18} />
              <input type="text" placeholder="Search livestock, breed, location..." />
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

                  {dashboardData.activity.length === 0 ? (
                    <div className="notification-item">
                      <strong>No notifications</strong>
                      <p>No marketplace updates yet.</p>
                    </div>
                  ) : (
                    dashboardData.activity.slice(0, 3).map((item, index) => (
                      <div
                        className={index === 0 ? "notification-item unread" : "notification-item"}
                        key={index}
                      >
                        <strong>New listing available</strong>
                        <p>
                          {item.breed} posted in {item.location}.
                        </p>
                        <small>Recently</small>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="buyer-profile-chip">
              <div className="profile-avatar">{firstLetter}</div>
              <div>
                <strong>{buyerName}</strong>
                <p>Verified Buyer</p>
              </div>
            </div>
          </div>
        </header>

        <section className="buyer-hero">
          <div>
            <span>Livestock Discovery</span>
            <h2>Explore verified livestock listings from farmers in Veruela.</h2>
            <p>
              Search by livestock type, price, seller location, and availability.
              Send inquiries directly and monitor your purchase progress.
            </p>

            <div className="hero-actions">
              <Link to="/marketplace">
                Browse Marketplace
                <ArrowUpRight size={18} />
              </Link>

              <Link className="secondary" to="/buyer-map">
                View Nearby Sellers
              </Link>
            </div>
          </div>

          <div className="hero-highlight">
            <strong>{dashboardData.stats.availableListings}</strong>
            <span>Available listings</span>
          </div>
        </section>

        <section className="buyer-kpi-grid">
          <KpiCard
            icon={<Heart />}
            value={dashboardData.stats.savedListings}
            label="Saved Listings"
            note="Your favorites"
          />

          <KpiCard
            icon={<MessageCircle />}
            value={dashboardData.stats.activeInquiries}
            label="Active Inquiries"
            note="Seller conversations"
          />

          <KpiCard
            icon={<ShoppingBag />}
            value={dashboardData.stats.completedPurchases}
            label="Completed Purchases"
            note="Transaction history"
          />

          <KpiCard
            icon={<MapPin />}
            value={dashboardData.stats.nearbySellers}
            label="Nearby Sellers"
            note="Available livestock posts"
          />
        </section>

        <section className="buyer-content-grid">
          <div className="buyer-panel wide">
            <div className="panel-header">
              <div>
                <h3>Recommended Livestock</h3>
                <p>Latest available listings from the marketplace.</p>
              </div>

              <Link to="/marketplace">View all</Link>
            </div>

            <div className="recommended-grid">
              {dashboardData.recommended.length === 0 ? (
                <p>No available livestock listings yet.</p>
              ) : (
                dashboardData.recommended.map((item) => (
                  <div className="recommended-card" key={item.id}>
                    <div className="recommended-image">
                      <img src={item.image_url || defaultImage} alt={item.breed} />
                      <span>{item.livestock_type}</span>
                      <button>
                        <Heart size={17} />
                      </button>
                    </div>

                    <div className="recommended-body">
                      <div className="recommended-title">
                        <div>
                          <h4>{item.breed}</h4>
                          <p>{item.seller_name}</p>
                        </div>

                        <strong>₱{Number(item.price).toLocaleString()}</strong>
                      </div>

                      <div className="recommended-location">
                        <MapPin size={15} />
                        {item.location} • {item.age}
                      </div>

                      <div className="recommended-actions">
                        <button>
                          <Eye size={16} />
                          View Details
                        </button>

                        <button className="inquire">
                          <MessageCircle size={16} />
                          Inquire
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <aside className="buyer-panel">
            <div className="panel-header compact">
              <div>
                <h3>Recent Inquiries</h3>
                <p>Your latest seller conversations.</p>
              </div>
            </div>

            {dashboardData.recentInquiries.length === 0 ? (
              <p>No inquiries yet.</p>
            ) : (
              dashboardData.recentInquiries.map((item, index) => (
                <InquiryItem
                  key={index}
                  icon={
                    item.status === "Completed" ? (
                      <ShieldCheck />
                    ) : item.status === "Negotiation" ? (
                      <MessageCircle />
                    ) : (
                      <Clock />
                    )
                  }
                  title={item.breed || item.livestock_type}
                  text={`${item.livestock_type} inquiry update`}
                  status={item.status}
                />
              ))
            )}
          </aside>
        </section>

        <section className="buyer-bottom-grid">
          <div className="buyer-panel">
            <div className="panel-header">
              <div>
                <h3>Marketplace Activity</h3>
                <p>Latest updates from livestock sellers.</p>
              </div>
            </div>

            {dashboardData.activity.length === 0 ? (
              <p>No marketplace activity yet.</p>
            ) : (
              dashboardData.activity.map((item, index) => (
                <ActivityItem
                  key={index}
                  title={`New ${item.livestock_type} listing posted`}
                  text={`${item.location} • ₱${Number(item.price).toLocaleString()}`}
                />
              ))
            )}
          </div>

          <div className="buyer-panel">
            <div className="panel-header">
              <div>
                <h3>Nearby Seller Map</h3>
                <p>Preview of seller locations near you.</p>
              </div>

              <MapPin size={22} />
            </div>

            <div className="buyer-map-preview">
              <div className="map-pin one"></div>
              <div className="map-pin two"></div>
              <div className="map-pin three"></div>

              <div className="map-label">
                <strong>Veruela, Agusan del Sur</strong>
                <p>{dashboardData.stats.nearbySellers} mapped livestock sellers</p>
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
    <div className="buyer-kpi-card">
      <div className="kpi-icon">{icon}</div>
      <h2>{value}</h2>
      <p>{label}</p>
      <small>{note}</small>
    </div>
  );
}

function InquiryItem({ icon, title, text, status }) {
  return (
    <div className="inquiry-item">
      <div className="inquiry-icon">{icon}</div>

      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>

      <span>{status}</span>
    </div>
  );
}

function ActivityItem({ title, text }) {
  return (
    <div className="buyer-activity-item">
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>

      <TrendingUp size={18} />
    </div>
  );
}

export default BuyerDashboard;