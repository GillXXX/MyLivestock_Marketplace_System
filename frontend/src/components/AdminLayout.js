import { useState } from "react";

import {
  LayoutDashboard,
  Users,
  UserCog,
  ClipboardCheck,
  ShieldCheck,
  FileCheck2,
  MapPin,
  BarChart3,
  BellRing,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";

import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import NotificationBell from "./NotificationBell";
import "../pages/AdminDashboard.css";

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isSuperAdmin = currentUser.role === "admin";
  const adminFirstName = currentUser.fullName ? currentUser.fullName.split(" ")[0] : "Admin";
  const adminFirstLetter = currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : "A";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const isActive = (path) => (location.pathname === path ? "active" : "");

  return (
    <div className="pro-admin">
      <div className="pro-mobile-bar">
        <button
          type="button"
          className="pro-mobile-menu-btn"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open menu"
          aria-expanded={mobileNavOpen}
        >
          <Menu size={22} />
        </button>

        <div className="pro-mobile-brand">
          <img src={logo} alt="VOLT logo" />
          <span>VOLT Admin</span>
        </div>

        <div className="pro-mobile-actions">
          <NotificationBell role="admin" />

          <div className="pro-mobile-profile-chip">
            <div className="pro-mobile-profile-avatar">{adminFirstLetter}</div>
            <div>
              <strong>{adminFirstName}</strong>
              <span>{isSuperAdmin ? "Administrator" : "MAO Staff"}</span>
            </div>
          </div>
        </div>
      </div>

      {mobileNavOpen && (
        <div
          className="pro-mobile-overlay"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside className={`pro-sidebar ${mobileNavOpen ? "mobile-open" : ""}`}>
        <button
          type="button"
          className="pro-mobile-close"
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close menu"
        >
          <X size={20} />
        </button>

        <div className="pro-brand">
          <img src={logo} className="pro-brand-logo" alt="VOLT logo" />

          <div>
            <h3>VOLT Admin</h3>
            <p>Veruela MAO</p>
          </div>
        </div>

        <nav onClick={() => setMobileNavOpen(false)}>
          <p className="nav-group-label">Overview</p>
          <Link className={isActive("/admin-dashboard")} to="/admin-dashboard">
            <LayoutDashboard size={20} /> Dashboard
          </Link>

          <p className="nav-group-label">Management</p>
          {isSuperAdmin && (
            <Link className={isActive("/admin-users")} to="/admin-users">
              <Users size={20} /> Users
            </Link>
          )}

          {isSuperAdmin && (
            <Link className={isActive("/admin-staff")} to="/admin-staff">
              <UserCog size={20} /> Staff
            </Link>
          )}

          <Link className={isActive("/admin-listings")} to="/admin-listings">
            <ClipboardCheck size={20} /> Listings
          </Link>

          <Link className={isActive("/admin-verification")} to="/admin-verification">
            <ShieldCheck size={20} /> Verification
          </Link>

          <Link className={isActive("/admin-transactions")} to="/admin-transactions">
            <FileCheck2 size={20} /> Transactions
          </Link>

          <p className="nav-group-label">Insights</p>
          <Link className={isActive("/admin-map")} to="/admin-map">
            <MapPin size={20} /> Map Monitoring
          </Link>

          <Link className={isActive("/admin-reports")} to="/admin-reports">
            <BarChart3 size={20} /> Reports
          </Link>

          <p className="nav-group-label">System</p>
          <Link className={isActive("/admin-notifications")} to="/admin-notifications">
            <BellRing size={20} /> Notifications
          </Link>

          {isSuperAdmin && (
            <Link className={isActive("/admin-settings")} to="/admin-settings">
              <Settings size={20} /> Settings
            </Link>
          )}
        </nav>

        <button
          className="pro-logout"
          onClick={() => {
            setMobileNavOpen(false);
            handleLogout();
          }}
        >
          <LogOut size={20} /> Logout
        </button>

        <div className="sidebar-status">
          <span className="pulse-dot-sm"></span> System Online
        </div>
      </aside>

      <div style={{ flex: 1, minWidth: 0 }}>
        <Outlet />
      </div>
    </div>
  );
}

export default AdminLayout;
