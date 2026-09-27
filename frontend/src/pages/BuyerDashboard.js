import { useEffect, useState } from "react";

import {
  Store,
  Heart,
  MessageCircle,
  MapPin,
  ShoppingBag,
  ArrowUpRight,
  CalendarCheck,
  Clock3,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import InquiryModal from "../components/InquiryModal";
import NotificationBell from "../components/NotificationBell";
import AdminStatCard from "../components/AdminStatCard";
import { API_URL, DEFAULT_LISTING_IMAGE } from "../config";
import { getProductIcon, formatPrice } from "../utils/productCatalog";
import "./BuyerDashboard.css";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function isVeryRecent(time) {
  if (!time) return false;
  const diffMins = (Date.now() - new Date(time).getTime()) / 60000;
  return diffMins <= 60;
}

function formatPostedTime(time) {
  if (!time) return "";

  const diffDays = Math.floor((Date.now() - new Date(time).getTime()) / 86400000);

  if (diffDays <= 0) return "Posted today";
  if (diffDays === 1) return "Posted yesterday";
  if (diffDays < 30) return `Posted ${diffDays} days ago`;

  return `Posted ${new Date(time).toLocaleDateString()}`;
}

function formatRelativeTime(time) {
  if (!time) return "";

  const diffMs = Date.now() - new Date(time).getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(time).toLocaleDateString();
}

function BuyerDashboard() {
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [inquiryListing, setInquiryListing] = useState(null);

  const defaultImage = DEFAULT_LISTING_IMAGE;

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
        setFavoriteIds(data.favoriteListingIds || []);
        setLoading(false);
      } catch (error) {
        setMessage("Cannot connect to backend server");
        setLoading(false);
      }
    };

    fetchBuyerDashboard();
  }, [navigate]);

  const toggleFavorite = async (listingId) => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    const isFavorited = favoriteIds.includes(listingId);

    try {
      const res = await fetch(
        `${API_URL}/api/favorites${isFavorited ? `/${listingId}` : ""}`,
        {
          method: isFavorited ? "DELETE" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: isFavorited ? undefined : JSON.stringify({ listingId }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to update favorite");
        return;
      }

      setFavoriteIds((prev) =>
        isFavorited ? prev.filter((id) => id !== listingId) : [...prev, listingId]
      );
    } catch (error) {
      alert("Cannot connect to backend server");
    }
  };

  if (loading) {
    return (
      <main className="buyer-main">
        <div className="dash-skeleton">
          <div className="skel skel-topbar"></div>
          <div className="skel skel-hero"></div>
          <div className="skel-row">
            <div className="skel skel-kpi"></div>
            <div className="skel skel-kpi"></div>
            <div className="skel skel-kpi"></div>
            <div className="skel skel-kpi"></div>
          </div>
        </div>
      </main>
    );
  }

  if (message) {
    return <h2 style={{ padding: "30px", color: "red" }}>{message}</h2>;
  }

  const buyerName = dashboardData?.user?.full_name || "Buyer Account";
  const firstName = buyerName.split(" ")[0];
  const firstLetter = buyerName.charAt(0).toUpperCase();
  const rawImage = dashboardData?.user?.profile_image;
  const avatarUrl = rawImage
    ? rawImage.startsWith("http")
      ? rawImage
      : `${API_URL}${rawImage}`
    : null;
  const memberSinceYear = dashboardData?.user?.created_at
    ? new Date(dashboardData.user.created_at).getFullYear()
    : null;

  return (
    <>
      <main className="buyer-main">
        <header className="buyer-topbar">
          <div className="topbar-left">
            <div>
              <span className="eyebrow">Buyer Dashboard</span>
              <h1>
                {getGreeting()}, {firstName}
              </h1>
              <p>Browse verified listings, contact farmers, and track inquiries.</p>
            </div>
          </div>

          <div className="topbar-actions">
            <NotificationBell role="buyer" />

            <div className="buyer-profile-chip">
              {avatarUrl ? (
                <img className="profile-avatar-img" src={avatarUrl} alt="" />
              ) : (
                <div className="profile-avatar">{firstLetter}</div>
              )}
              <div>
                <strong>{buyerName}</strong>
                {memberSinceYear && (
                  <p>
                    <CalendarCheck size={12} /> Member since {memberSinceYear}
                  </p>
                )}
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
          <AdminStatCard
            icon={<Heart />}
            value={dashboardData.stats.savedListings}
            label="Saved Listings"
            note="Your favorites"
          />

          <AdminStatCard
            icon={<MessageCircle />}
            value={dashboardData.stats.activeInquiries}
            label="Active Inquiries"
            note="Seller conversations"
          />

          <AdminStatCard
            icon={<ShoppingBag />}
            value={dashboardData.stats.completedPurchases}
            label="Completed Purchases"
            note="Transaction history"
          />

          <AdminStatCard
            icon={<MapPin />}
            value={dashboardData.stats.nearbySellers}
            label="Nearby Sellers"
            note="Farmers with active listings"
          />
        </section>

        <section className="buyer-content-grid">
          <div className="buyer-panel wide">
            <div className="panel-header">
              <div>
                <h3>Newest Listings</h3>
                <p>Latest available listings from the marketplace.</p>
              </div>

              <Link to="/marketplace">View all</Link>
            </div>

            <div className="recommended-grid">
              {dashboardData.recommended.length === 0 ? (
                <p className="empty-note">No available livestock listings yet.</p>
              ) : (
                dashboardData.recommended.map((item) => (
                  <div className="recommended-card" key={item.id}>
                    <div className="recommended-image">
                      <img src={item.image_url || defaultImage} alt={item.breed || item.livestock_type} />

                      <span className="recommended-type-badge">{item.livestock_type}</span>

                      <button
                        type="button"
                        className="recommended-fav-btn"
                        onClick={() => toggleFavorite(item.id)}
                        title={favoriteIds.includes(item.id) ? "Remove from favorites" : "Add to favorites"}
                      >
                        <Heart
                          size={16}
                          fill={favoriteIds.includes(item.id) ? "currentColor" : "none"}
                          color={favoriteIds.includes(item.id) ? "red" : "currentColor"}
                        />
                      </button>
                    </div>

                    <div className="recommended-body">
                      <div className="recommended-title">
                        <div>
                          <h4>{item.breed || item.livestock_type}</h4>
                          <p className="seller-line">{item.seller_name}</p>
                        </div>

                        <strong>{formatPrice(item.price, item.unit)}</strong>
                      </div>

                      <div className="recommended-meta">
                        <div>
                          <MapPin size={14} />
                          <span>{item.location}</span>
                        </div>

                        {item.created_at && (
                          <div>
                            <Clock3 size={14} />
                            <span>{formatPostedTime(item.created_at)}</span>
                          </div>
                        )}
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

          <aside className="buyer-panel activity-panel">
            <div className="panel-header compact">
              <div>
                <h3>
                  Marketplace Activity
                  <span className="live-pulse-badge">
                    <span className="live-pulse-dot" />
                    Live
                  </span>
                </h3>
                <p>Latest updates from livestock sellers.</p>
              </div>

              <Link to="/marketplace">View all</Link>
            </div>

            {dashboardData.activity.length === 0 ? (
              <p className="empty-note">No marketplace activity yet.</p>
            ) : (
              dashboardData.activity.map((item, index) => (
                <ActivityItem
                  key={index}
                  type={item.livestock_type}
                  category={item.category}
                  unit={item.unit}
                  image={item.image_url}
                  title={`New ${item.livestock_type}${item.breed ? ` (${item.breed})` : ""} listing`}
                  location={item.location}
                  price={item.price}
                  time={formatRelativeTime(item.created_at)}
                  isFresh={isVeryRecent(item.created_at)}
                  tone={["green", "gold", "teal"][index % 3]}
                  last={index === dashboardData.activity.length - 1}
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

function ActivityItem({ type, category, unit, image, title, location, price, time, isFresh, tone = "green", last }) {
  const Icon = getProductIcon(type, category);

  return (
    <div className="buyer-activity-row">
      <div className="row-rail">
        <div className="row-thumb-wrap">
          {image ? (
            <img className="row-thumb" src={image} alt="" />
          ) : (
            <div className={`row-thumb row-thumb-icon tone-${tone}`}>
              <Icon size={17} />
            </div>
          )}
          {isFresh && <span className="row-thumb-live-dot" />}
        </div>
        {!last && <span className="row-rail-line"></span>}
      </div>

      <div className="buyer-activity-content">
        <strong>{title}</strong>
        <div className="buyer-activity-meta">
          <span className="buyer-activity-location">
            <MapPin size={12} />
            {location}
          </span>
          <span className="buyer-activity-price">{formatPrice(price, unit)}</span>
        </div>
      </div>

      {time && <span className="buyer-activity-time">{time}</span>}
    </div>
  );
}

export default BuyerDashboard;