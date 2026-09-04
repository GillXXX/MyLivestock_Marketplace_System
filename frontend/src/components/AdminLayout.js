import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  ShieldCheck,
  FileCheck2,
  MapPin,
  BarChart3,
  BellRing,
  Settings,
  LogOut,
} from "lucide-react";

import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import "../pages/AdminDashboard.css";

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const isActive = (path) => (location.pathname === path ? "active" : "");

  return (
    <div className="pro-admin">
      <aside className="pro-sidebar">
        <div className="pro-brand">
          <div className="pro-logo">MAO</div>

          <div>
            <h3>Livestock Admin</h3>
            <p>Veruela MAO</p>
          </div>
        </div>

        <nav>
          <p className="nav-group-label">Overview</p>
          <Link className={isActive("/admin-dashboard")} to="/admin-dashboard">
            <LayoutDashboard size={20} /> Dashboard
          </Link>

          <p className="nav-group-label">Management</p>
          <Link className={isActive("/admin-users")} to="/admin-users">
            <Users size={20} /> Users
          </Link>

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

          <Link className={isActive("/admin-settings")} to="/admin-settings">
            <Settings size={20} /> Settings
          </Link>
        </nav>

        <button className="pro-logout" onClick={handleLogout}>
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
