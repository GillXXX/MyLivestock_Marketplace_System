import { useState } from "react";

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
  Tractor,
} from "lucide-react";

import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import "../pages/FarmerDashboard.css";

function FarmerLayout() {
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
    <div className="farmer-shell">
      <aside className={sidebarOpen ? "farmer-sidebar" : "farmer-sidebar collapsed"}>
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
            <Tractor size={26} />
          </div>

          {sidebarOpen && (
            <div>
              <h3>HerdMarket</h3>
              <p>Farmer Portal</p>
            </div>
          )}
        </div>

        <nav className="farmer-nav">
          <Link className={isActive("/farmer-dashboard")} to="/farmer-dashboard">
            <Home size={20} />
            <span>Dashboard</span>
          </Link>

          <Link className={isActive("/listings")} to="/listings">
            <List size={20} />
            <span>My Listings</span>
          </Link>

          <Link className={isActive("/post")} to="/post">
            <PlusCircle size={20} />
            <span>Post Livestock</span>
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

      <div style={{ flex: 1, minWidth: 0 }}>
        <Outlet />
      </div>
    </div>
  );
}

export default FarmerLayout;
