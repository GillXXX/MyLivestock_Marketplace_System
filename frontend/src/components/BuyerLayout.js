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
  ChevronRight,
} from "lucide-react";

import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import NotificationBell from "./NotificationBell";
import { API_URL } from "../config";
import "../pages/BuyerDashboard.css";

function BuyerLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch(`${API_URL}/api/buyer/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setProfile(data.user);
      } catch (error) {
        // The mobile header chip is a convenience — pages that need
        // profile data fetch it themselves and surface real errors.
      }
    };

    fetchProfile();
  }, []);

  const profileName = profile?.full_name || "";
  const profileFirstLetter = profileName ? profileName.charAt(0).toUpperCase() : "";
  const profileAvatarUrl = profile?.profile_image
    ? profile.profile_image.startsWith("http")
      ? profile.profile_image
      : `${API_URL}${profile.profile_image}`
    : null;
  const memberSinceYear = profile?.created_at
    ? new Date(profile.created_at).getFullYear()
    : null;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const isActive = (path) => (location.pathname === path ? "active" : "");

  return (
    <div className="buyer-shell">
      <div className="buyer-mobile-bar">
        <button
          type="button"
          className="buyer-mobile-menu-btn"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open menu"
          aria-expanded={mobileNavOpen}
        >
          <Menu size={22} />
        </button>

        <div className="buyer-mobile-brand">
          <img src={logo} alt="VOLT logo" />
          <span>VOLT</span>
        </div>

        <div className="buyer-mobile-actions">
          <NotificationBell role="buyer" />

          <div className="buyer-mobile-profile-chip">
            {profileAvatarUrl ? (
              <img className="buyer-mobile-profile-avatar-img" src={profileAvatarUrl} alt="" />
            ) : (
              <div className="buyer-mobile-profile-avatar">{profileFirstLetter}</div>
            )}

            {profileName && (
              <div>
                <strong>{profileName.split(" ")[0]}</strong>
                {memberSinceYear && <span>Since {memberSinceYear}</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {mobileNavOpen && (
        <div
          className="buyer-mobile-overlay"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside
        className={`${sidebarOpen ? "buyer-sidebar" : "buyer-sidebar collapsed"} ${
          mobileNavOpen ? "mobile-open" : ""
        }`}
      >
        <button
          type="button"
          className="buyer-mobile-close"
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close menu"
        >
          <X size={20} />
        </button>

        <button
          type="button"
          className="buyer-sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        <div className="buyer-brand">
          <div className="buyer-logo">
            <img src={logo} alt="VOLT logo" />
          </div>

          {sidebarOpen && (
            <div>
              <h3>VOLT</h3>
              <p>Buyer Portal</p>
            </div>
          )}
        </div>

        <div className="buyer-nav-wrap">
          <nav className="buyer-nav" onClick={() => setMobileNavOpen(false)}>
            <Link className={isActive("/buyer-dashboard")} to="/buyer-dashboard">
              <Home size={20} />
              <span>Dashboard</span>
            </Link>

            <Link className={isActive("/marketplace")} to="/marketplace">
              <Store size={20} />
              <span>Marketplace</span>
            </Link>

            <Link className={isActive("/buyer-favorites")} to="/buyer-favorites">
              <Heart size={20} />
              <span>Saved Listings</span>
            </Link>

            <Link className={isActive("/buyer-messages")} to="/buyer-messages">
              <MessageCircle size={20} />
              <span>Messages</span>
            </Link>

            <Link className={isActive("/buyer-transactions")} to="/buyer-transactions">
              <FileCheck2 size={20} />
              <span>Transactions</span>
            </Link>

            <Link className={isActive("/buyer-notifications")} to="/buyer-notifications">
              <Bell size={20} />
              <span>Notifications</span>
            </Link>

            <Link className={isActive("/buyer-map")} to="/buyer-map">
              <MapPin size={20} />
              <span>Map Explorer</span>
            </Link>

            <Link className={isActive("/buyer-profile")} to="/buyer-profile">
              <User size={20} />
              <span>Profile</span>
            </Link>

            <Link className={isActive("/buyer-settings")} to="/buyer-settings">
              <Settings size={20} />
              <span>Settings</span>
            </Link>
          </nav>

          {/* Mobile-only hint that the nav scrolls horizontally — without
              it, items past the visible edge (e.g. Settings) are easy to
              never discover on a phone. */}
          <div className="buyer-nav-fade" aria-hidden="true">
            <ChevronRight size={16} />
          </div>
        </div>

        <button
          className="buyer-logout"
          onClick={() => {
            setMobileNavOpen(false);
            handleLogout();
          }}
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </aside>

      <div style={{ flex: 1, minWidth: 0 }}>
        <Outlet />
      </div>
    </div>
  );
}

export default BuyerLayout;
