import { useEffect, useState } from "react";

import {
  Store,
  Heart,
  MessageCircle,
  MapPin,
  ShoppingBag,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import InquiryModal from "../components/InquiryModal";
import NotificationBell from "../components/NotificationBell";
import { API_URL } from "../config";
import "./BuyerDashboard.css";

function BuyerDashboard() {
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [inquiryListing, setInquiryListing] = useState(null);

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

        const res = await fetch(`${API_URL}/api/buyer/dashboard`, {
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

  const addToFavorites = async (listingId) => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch(`${API_URL}/api/favorites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ listingId }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to add favorite");
        return;
      }

      setFavoriteIds((prev) =>
        prev.includes(listingId) ? prev : [...prev, listingId]
      );

      alert("Added to favorites ❤️");
    } catch (error) {
      alert("Cannot connect to backend server");
    }
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
    <>
      <main className="buyer-main">
        <header className="buyer-topbar">
          <div className="topbar-left">
            <div>
              <span className="eyebrow">Buyer Dashboard</span>
              <h1>Find livestock with confidence</h1>
              <p>Browse verified listings, contact farmers, and track inquiries.</p>
            </div>
          </div>

          <div className="topbar-actions">
            <NotificationBell role="buyer" />

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
          <Store className="hero-watermark" />

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
            tone="gold"
          />

          <KpiCard
            icon={<MessageCircle />}
            value={dashboardData.stats.activeInquiries}
            label="Active Inquiries"
            note="Seller conversations"
            tone="teal"
          />

          <KpiCard
            icon={<ShoppingBag />}
            value={dashboardData.stats.completedPurchases}
            label="Completed Purchases"
            note="Transaction history"
            tone="green"
          />

          <KpiCard
            icon={<MapPin />}
            value={dashboardData.stats.nearbySellers}
            label="Nearby Sellers"
            note="Farmers with active listings"
            tone="terracotta"
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
                      <button
                        type="button"
                        onClick={() => addToFavorites(item.id)}
                      >
                        <Heart
                          size={17}
                          fill={favoriteIds.includes(item.id) ? "currentColor" : "none"}
                          color={favoriteIds.includes(item.id) ? "red" : "currentColor"}
                        />
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
                        <button
                          className="inquire"
                          type="button"
                          onClick={() => setInquiryListing(item)}
                        >
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
                  tone={["green", "gold", "teal"][index % 3]}
                />
              ))
            )}
          </aside>
        </section>
      </main>

      {inquiryListing && (
        <InquiryModal
          listing={inquiryListing}
          onClose={() => setInquiryListing(null)}
        />
      )}
    </>
  );
}

function KpiCard({ icon, value, label, note, tone = "green" }) {
  return (
    <div className={`buyer-kpi-card tone-${tone}`}>
      <div className="kpi-icon">{icon}</div>
      <h2>{value}</h2>
      <p>{label}</p>
      <small>{note}</small>
    </div>
  );
}

function ActivityItem({ title, text, tone = "green" }) {
  return (
    <div className="buyer-activity-item">
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>

      <div className={`activity-badge tone-${tone}`}>
        <TrendingUp size={16} />
      </div>
    </div>
  );
}

export default BuyerDashboard;