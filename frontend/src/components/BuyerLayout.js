import { useState } from "react";

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
  ShoppingCart,
} from "lucide-react";

import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import "../pages/BuyerDashboard.css";

function BuyerLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const isActive = (path) => (location.pathname === path ? "active" : "");

  return (
    <div className="buyer-shell">
      <aside className={sidebarOpen ? "buyer-sidebar" : "buyer-sidebar collapsed"}>
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
            <ShoppingCart size={26} />
          </div>

          {sidebarOpen && (
            <div>
              <h3>HerdMarket</h3>
              <p>Buyer Portal</p>
            </div>
          )}
        </div>

        <nav className="buyer-nav">
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

      <div style={{ flex: 1, minWidth: 0 }}>
        <Outlet />
      </div>
    </div>
  );
}

export default BuyerLayout;
