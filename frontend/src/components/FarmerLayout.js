import { useEffect, useState } from "react";

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
  FileCheck2,
  Settings,
  ChevronRight,
} from "lucide-react";

import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import NotificationBell from "./NotificationBell";
import { API_URL } from "../config";
import { logout } from "../utils/auth";
import LogoutConfirmModal from "./LogoutConfirmModal";
import "../pages/FarmerDashboard.css";

function FarmerLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch(`${API_URL}/api/farmer/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setProfile(data);
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
  const memberSinceYear = profile?.joinedYear || null;

  const handleLogout = () => logout(navigate);

  const isActive = (path) => (location.pathname === path ? "active" : "");

  return (
    <div className="farmer-shell">
      <div className="farmer-mobile-bar">
        <button
          type="button"
          className="farmer-mobile-menu-btn"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open menu"
          aria-expanded={mobileNavOpen}
        >
          <Menu size={22} />
        </button>

        <div className="farmer-mobile-brand">
          <img src={logo} alt="VOLT logo" />
          <span>VOLT</span>
        </div>

        <div className="farmer-mobile-actions">
          <NotificationBell role="farmer" />

          <div className="farmer-mobile-profile-chip">
            {profileAvatarUrl ? (
              <img className="farmer-mobile-profile-avatar-img" src={profileAvatarUrl} alt="" />
            ) : (
              <div className="farmer-mobile-profile-avatar">{profileFirstLetter}</div>
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
          className="farmer-mobile-overlay"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside
        className={`${sidebarOpen ? "farmer-sidebar" : "farmer-sidebar collapsed"} ${
          mobileNavOpen ? "mobile-open" : ""
        }`}
      >
        <button
          type="button"
          className="farmer-mobile-close"
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close menu"
        >
          <X size={20} />
        </button>

        <button
          type="button"
          className="farmer-sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        <div className="farmer-brand">
          <div className="farmer-logo">
            <img src={logo} alt="VOLT logo" />
          </div>

          {sidebarOpen && (
            <div>
              <h3>VOLT</h3>
              <p>Farmer Portal</p>
            </div>
          )}
        </div>

        <div className="farmer-nav-wrap">
          <nav className="farmer-nav" onClick={() => setMobileNavOpen(false)}>
            <Link className={isActive("/farmer-dashboard")} to="/farmer-dashboard">
              <Home size={20} />
              <span>Dashboard</span>
            </Link>

            <Link className={isActive("/post")} to="/post">
              <PlusCircle size={20} />
              <span>Post Livestock</span>
            </Link>

            <Link className={isActive("/listings")} to="/listings">
              <List size={20} />
              <span>My Listings</span>
            </Link>

            <Link className={isActive("/farmer-messages")} to="/farmer-messages">
              <MessageCircle size={20} />
              <span>Messages</span>
            </Link>

            <Link className={isActive("/farmer-transactions")} to="/farmer-transactions">
              <FileCheck2 size={20} />
              <span>Transactions</span>
            </Link>

            <Link className={isActive("/farmer-notifications")} to="/farmer-notifications">
              <Bell size={20} />
              <span>Notifications</span>
            </Link>

            <Link className={isActive("/profile")} to="/profile">
              <User size={20} />
              <span>Profile</span>
            </Link>

            <Link className={isActive("/farmer-settings")} to="/farmer-settings">
              <Settings size={20} />
              <span>Settings</span>
            </Link>
          </nav>

          {/* Mobile-only hint that the nav scrolls horizontally — without
              it, items past the visible edge (e.g. Settings) are easy to
              never discover on a phone. */}
          <div className="farmer-nav-fade" aria-hidden="true">
            <ChevronRight size={16} />
          </div>
        </div>

        <button
          className="farmer-logout"
          onClick={() => {
            setMobileNavOpen(false);
            setConfirmLogout(true);
          }}
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </aside>

      <div style={{ flex: 1, minWidth: 0 }}>
        <Outlet />
      </div>

      <LogoutConfirmModal
        open={confirmLogout}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
}

export default FarmerLayout;
