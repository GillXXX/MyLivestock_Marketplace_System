import { useState, useEffect } from "react";

import {
  MessageCircle,
  TrendingUp,
  CheckCircle,
  ClipboardList,
  ArrowUpRight,
  ArrowRight,
  Clock,
  BadgeCheck,
  ShieldCheck,
  AlertTriangle,
  Wallet,
  Sparkles,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import NotificationBell from "../components/NotificationBell";
import AdminStatCard from "../components/AdminStatCard";
import { API_URL } from "../config";
import { getProductIcon, formatPrice } from "../utils/productCatalog";
import "./FarmerDashboard.css";

const WORKFLOW_STEPS = ["Inquiry", "Negotiation", "Confirmation", "Completed"];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getListingStatusMeta(status) {
  if (status === "Available") return { label: "Available", tone: "available" };
  if (status === "Pending") return { label: "Pending", tone: "pending" };
  if (status === "Flagged") return { label: "Flagged", tone: "flagged" };
  if (status === "Rejected") return { label: "Rejected", tone: "flagged" };
  if (status === "Sold") return { label: "Sold", tone: "sold" };
  if (status === "Draft") return { label: "Draft", tone: "draft" };
  return { label: status, tone: "pending" };
}

function getVerificationMeta(isVerified, status) {
  if (isVerified) return { label: "Verified Farmer", icon: ShieldCheck, tone: "verified" };
  if (status === "Pending") return { label: "Verification Pending", icon: Clock, tone: "pending" };
  if (status === "Rejected") return { label: "Verification Rejected", icon: AlertTriangle, tone: "rejected" };
  return { label: "Not Verified", icon: AlertTriangle, tone: "rejected" };
}

function getHeroMessage(stats) {
  if (stats.activeListings === 0) {
    return {
      headline: "Ready to reach more buyers?",
      body: "You don't have any active listings yet. Post your first livestock or farm product to start getting inquiries from verified buyers.",
    };
  }

  if (stats.buyerInquiries === 0) {
    return {
      headline: "Your listings are live — inquiries are next.",
      body: `You have ${stats.activeListings} active listing${
        stats.activeListings === 1 ? "" : "s"
      } and ${stats.marketplaceViews} marketplace views so far. Keep details updated to turn views into inquiries.`,
    };
  }

  return {
    headline: "Your herd is gaining more buyer attention.",
    body: `You've received ${stats.buyerInquiries} buyer inquir${
      stats.buyerInquiries === 1 ? "y" : "ies"
    } across ${stats.marketplaceViews} marketplace views. Keep your listings updated to build buyer trust.`,
  };
}

function getActivityMeta(title) {
  if (title?.startsWith("New listing posted")) return { icon: ClipboardList, tone: "green" };
  if (title?.startsWith("New buyer inquiry")) return { icon: MessageCircle, tone: "gold" };
  if (title?.startsWith("Transaction update")) return { icon: BadgeCheck, tone: "teal" };
  return { icon: Clock, tone: "gold" };
}

function formatRelativeTime(time) {
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
    return (
      <main className="farmer-main">
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

  if (error) {
    return <h2 style={{ padding: "30px", color: "red" }}>{error}</h2>;
  }

  const userName = dashboardData?.user?.full_name || "Farmer";
  const firstName = userName.split(" ")[0];
  const firstLetter = userName.charAt(0).toUpperCase();
  const rawImage = dashboardData?.user?.profile_image;
  const avatarUrl = rawImage
    ? rawImage.startsWith("http")
      ? rawImage
      : `${API_URL}${rawImage}`
    : null;

  const workflows = dashboardData.workflows || [];
  const flaggedListings = dashboardData.flaggedListings || [];
  const visibleActivities = showAllActivities
    ? dashboardData.activities
    : dashboardData.activities.slice(0, 5);

  const isVerified = Boolean(dashboardData.user.is_verified);
  const verificationStatus = dashboardData.user.verification_status;
  const verMeta = getVerificationMeta(isVerified, verificationStatus);
  const hero = getHeroMessage(dashboardData.stats);
  const needsAttention = !isVerified || flaggedListings.length > 0;

  return (
    <main className="farmer-main">
      <header className="farmer-topbar">
        <div className="topbar-left">
          <div>
            <span className="eyebrow">Farmer Dashboard</span>
            <h1>
              {getGreeting()}, {firstName}
            </h1>
            <p>Here's what's happening across your listings and deals today.</p>
          </div>
        </div>

        <div className="topbar-actions">
          <NotificationBell role="farmer" />

          <div className="farmer-profile-chip">
            {avatarUrl ? (
              <img className="profile-avatar-img" src={avatarUrl} alt="" />
            ) : (
              <div className="profile-avatar">{firstLetter}</div>
            )}

            <div>
              <strong>{userName}</strong>
              <p className={`tone-${verMeta.tone}`}>
                <verMeta.icon size={12} /> {verMeta.label}
              </p>
            </div>
          </div>
        </div>
      </header>

      {needsAttention && (
        <section className="attention-banner">
          {!isVerified && (
            <div className={`attention-item ${verificationStatus === "Rejected" ? "danger" : "warning"}`}>
              <verMeta.icon size={20} />
              <div>
                <strong>{verMeta.label}</strong>
                <p>
                  {verificationStatus === "Rejected"
                    ? dashboardData.user.verification_note || "Please review and resubmit your documents."
                    : verificationStatus === "Pending"
                    ? "Your documents were submitted and are being reviewed by MAO."
                    : "Verify your account to unlock posting new listings."}
                </p>
              </div>
              <Link to="/profile">
                Go to Profile <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {flaggedListings.length > 0 && (
            <div className="attention-item danger">
              <AlertTriangle size={20} />
              <div>
                <strong>
                  {flaggedListings.length} listing{flaggedListings.length === 1 ? "" : "s"} need
                  {flaggedListings.length === 1 ? "s" : ""} your attention
                </strong>
                <p>
                  {flaggedListings[0].livestock_type}
                  {flaggedListings[0].status === "Flagged" ? " was flagged" : " was rejected"}
                  {flaggedListings[0].review_note ? `: ${flaggedListings[0].review_note}` : "."}
                  {flaggedListings.length > 1 ? ` +${flaggedListings.length - 1} more.` : ""}
                </p>
              </div>
              <Link to="/listings">
                Review <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </section>
      )}

      <section className="farmer-hero-card">
        <TrendingUp className="hero-watermark" />

        <div className="hero-main">
          <span className="hero-tag">
            <Sparkles size={13} /> Marketplace Performance
          </span>
          <h2>{hero.headline}</h2>
          <p>{hero.body}</p>

          <div className="hero-actions">
            {isVerified ? (
              <Link to="/post">
                Post New Listing
                <ArrowUpRight size={18} />
              </Link>
            ) : (
              <Link to="/profile">
                Complete Verification
                <ArrowUpRight size={18} />
              </Link>
            )}

            <Link className="secondary" to="/farmer-messages">
              View Messages
            </Link>

            <Link className="ghost" to="/listings">
              Manage Listings
            </Link>
          </div>
        </div>

        <div className="hero-side">
          <div className="hero-metric">
            <strong>{dashboardData.stats.buyerInquiries}</strong>
            <span>Buyer inquiries</span>
          </div>

          <div className="hero-mini-stats">
            <div>
              <CheckCircle size={15} />
              <span>{dashboardData.stats.activeListings} active listings</span>
            </div>
            <div>
              <Wallet size={15} />
              <span>₱{Number(dashboardData.stats.tradeValue).toLocaleString()} traded</span>
            </div>
          </div>
        </div>
      </section>

      <section className="kpi-grid">
        <AdminStatCard
          icon={<TrendingUp />}
          value={dashboardData.stats.activeListings}
          label="Active Listings"
          note={`${dashboardData.stats.totalListings} total posts`}
        />

        <AdminStatCard
          icon={<MessageCircle />}
          value={dashboardData.stats.buyerInquiries}
          label="Buyer Inquiries"
          note="Total inquiries"
        />

        <AdminStatCard
          icon={<CheckCircle />}
          value={dashboardData.stats.completedSales}
          label="Completed Sales"
          note="Recorded transactions"
        />

        <AdminStatCard
          icon={<Wallet />}
          value={`₱${Number(dashboardData.stats.tradeValue).toLocaleString()}`}
          label="Trade Value"
          note="Estimated total"
        />
      </section>

      {workflows.length > 0 && (
        <section className="dashboard-card deals-card">
          <div className="card-header">
            <div>
              <h3>
                Active Deals in Progress <span className="card-count">{workflows.length}</span>
              </h3>
              <p>Deals currently being negotiated with buyers.</p>
            </div>

            <Link className="card-action" to="/farmer-transactions">
              View all
            </Link>
          </div>

          {workflows.map((deal, index) => (
            <DealRow
              key={index}
              type={deal.livestock_type}
              category={deal.category}
              buyer={deal.buyer_name}
              step={deal.workflow_step}
              image={deal.image_url}
            />
          ))}
        </section>
      )}

      <section className="dashboard-grid">
        <div className="dashboard-card wide">
          <div className="card-header">
            <div>
              <h3>
                Recent Activity <span className="card-count">{dashboardData.activities.length}</span>
              </h3>
              <p>Latest updates from your marketplace transactions.</p>
            </div>

            {dashboardData.activities.length > 5 && (
              <button className="card-action" onClick={() => setShowAllActivities(!showAllActivities)}>
                {showAllActivities ? "Show less" : "View all"}
              </button>
            )}
          </div>

          {dashboardData.activities.length === 0 ? (
            <p className="empty-note">No recent activity yet.</p>
          ) : (
            visibleActivities.map((item, index) => {
              const meta = getActivityMeta(item.title);
              return (
                <ActivityItem
                  key={index}
                  icon={meta.icon}
                  tone={meta.tone}
                  title={item.title}
                  text={item.text}
                  time={formatRelativeTime(item.created_at)}
                  last={index === visibleActivities.length - 1}
                />
              );
            })
          )}
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div>
              <h3>My Listings</h3>
              <p>Current listing status overview.</p>
            </div>

            <Link className="card-action" to="/listings">
              View all
            </Link>
          </div>

          {dashboardData.stats.totalListings > 0 && (
            <div className="listing-breakdown">
              <span className="tone-available">{dashboardData.stats.activeListings} Active</span>
              <span className="tone-pending">{dashboardData.stats.pendingReview} Pending</span>
              {dashboardData.stats.flaggedCount > 0 && (
                <span className="tone-flagged">{dashboardData.stats.flaggedCount} Flagged</span>
              )}
              <span className="tone-sold">{dashboardData.stats.soldCount} Sold</span>
              {dashboardData.stats.draftCount > 0 && (
                <span className="tone-draft">{dashboardData.stats.draftCount} Draft</span>
              )}
            </div>
          )}

          {dashboardData.listings.length === 0 ? (
            <p className="empty-note">No listings yet.</p>
          ) : (
            dashboardData.listings.map((item) => (
              <ListingItem
                key={item.id}
                type={item.livestock_type}
                category={item.category}
                name={item.livestock_type}
                detail={`${item.breed ? `${item.breed} • ` : ""}${formatPrice(item.price, item.unit)}`}
                status={item.status}
                image={item.image_url}
              />
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function RowThumb({ image, Icon, alt, last, tone }) {
  return (
    <div className="row-rail">
      {image ? (
        <img className="row-thumb" src={image} alt={alt} />
      ) : (
        <div className={`row-thumb row-thumb-icon${tone ? ` tone-${tone}` : ""}`}>
          <Icon size={18} />
        </div>
      )}
      {!last && <span className="row-rail-line"></span>}
    </div>
  );
}

function ActivityItem({ icon: Icon, title, text, time, tone = "green", last }) {
  return (
    <div className="activity-row">
      <RowThumb Icon={Icon} alt="" last={last} tone={tone} />

      <div className="activity-content">
        <strong>{title}</strong>
        <p>{text}</p>
      </div>

      <span className="activity-time">{time}</span>
    </div>
  );
}

function ListingItem({ type, category, name, detail, status, image }) {
  const Icon = getProductIcon(type, category);
  const meta = getListingStatusMeta(status);

  return (
    <div className="listing-row">
      <div className="listing-left">
        {image ? (
          <img className="row-thumb" src={image} alt={name} />
        ) : (
          <div className="row-thumb row-thumb-icon">
            <Icon size={18} />
          </div>
        )}

        <div>
          <strong>{name}</strong>
          <p>{detail}</p>
        </div>
      </div>

      <span className={`status ${meta.tone}`}>{meta.label}</span>
    </div>
  );
}

function DealRow({ type, category, buyer, step, image }) {
  const Icon = getProductIcon(type, category);
  const activeIndex = WORKFLOW_STEPS.indexOf(step);

  return (
    <div className="listing-row deal-row">
      <div className="listing-left">
        {image ? (
          <img className="row-thumb" src={image} alt={type} />
        ) : (
          <div className="row-thumb row-thumb-icon">
            <Icon size={18} />
          </div>
        )}

        <div>
          <strong>{type}</strong>
          <p>{buyer}</p>
        </div>
      </div>

      <div className="deal-progress-wrap">
        <span className="status step">{step}</span>
        <div className="deal-progress">
          {WORKFLOW_STEPS.map((s, index) => (
            <span key={s} className={index <= activeIndex ? "filled" : ""}></span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FarmerDashboard;
