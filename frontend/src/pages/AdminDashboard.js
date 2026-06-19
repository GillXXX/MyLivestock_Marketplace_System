import { useEffect, useState } from "react";

import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  ShieldCheck,
  FileCheck2,
  BarChart3,
  Bell,
  BellRing,
  Search,
  Settings,
  LogOut,
  MapPin,
  Eye,
  CheckCircle,
  AlertTriangle,
  Clock,
  UserCircle,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();

  const [showNotif, setShowNotif] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchAdminDashboard = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const res = await fetch("http://localhost:5000/api/admin/dashboard", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          setMessage(data.message || "Failed to load admin dashboard");
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

    fetchAdminDashboard();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (loading) return <h2 style={{ padding: "30px" }}>Loading admin dashboard...</h2>;

  if (message) {
    return <h2 style={{ padding: "30px", color: "red" }}>{message}</h2>;
  }

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
          <Link className="active" to="/admin-dashboard">
            <LayoutDashboard size={20} /> Dashboard
          </Link>

          <Link to="/admin-users">
            <Users size={20} /> Users
          </Link>

          <Link to="/admin-listings">
            <ClipboardCheck size={20} /> Listings
          </Link>

          <Link to="/admin-verification">
            <ShieldCheck size={20} /> Verification
          </Link>

          <Link to="/admin-transactions">
            <FileCheck2 size={20} /> Transactions
          </Link>

          <Link to="/admin-map">
            <MapPin size={20} /> Map Monitoring
          </Link>

          <Link to="/admin-notifications">
            <BellRing size={20} /> Notifications
          </Link>

          <Link to="/admin-reports">
            <BarChart3 size={20} /> Reports
          </Link>

          <Link to="/admin-settings">
            <Settings size={20} /> Settings
          </Link>
        </nav>

        <button className="pro-logout" onClick={handleLogout}>
          <LogOut size={20} /> Logout
        </button>
      </aside>

      <main className="pro-main">
        <header className="pro-topbar">
          <div>
            <span>Municipal Agriculture Office</span>
            <h1>Admin Command Center</h1>
            <p>
              Monitor users, listings, verification, transactions, reports, and
              seller locations.
            </p>
          </div>

          <div className="pro-actions">
            <div className="pro-search">
              <Search size={18} />
              <input placeholder="Search records..." />
            </div>

            <div className="notif-wrap">
              <button
                onClick={() => setShowNotif(!showNotif)}
                className="pro-icon-btn"
              >
                <Bell size={21} />
                <i></i>
              </button>

              {showNotif && (
                <div className="notif-panel">
                  <h4>Notifications</h4>

                  {dashboardData.activity.length === 0 ? (
                    <div className="notif-item">
                      <strong>No notifications</strong>
                      <p>No recent system activity.</p>
                    </div>
                  ) : (
                    dashboardData.activity.slice(0, 3).map((item, index) => (
                      <div
                        className={index === 0 ? "notif-item unread" : "notif-item"}
                        key={index}
                      >
                        <strong>Listing update</strong>
                        <p>
                          {item.farmer_name} submitted {item.livestock_type}.
                        </p>
                        <small>Recently</small>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="admin-profile">
              <UserCircle size={34} />

              <div>
                <strong>MAO Admin</strong>
                <p>Administrator</p>
              </div>
            </div>
          </div>
        </header>

        <section className="kpi-grid">
          <Kpi
            title="Registered Users"
            value={dashboardData.stats.registeredUsers}
            trend="Farmers and buyers"
            icon={<Users />}
          />

          <Kpi
            title="Active Listings"
            value={dashboardData.stats.activeListings}
            trend="Available livestock"
            icon={<ClipboardCheck />}
          />

          <Kpi
            title="Pending Verification"
            value={dashboardData.stats.pendingVerification}
            trend="Needs action"
            icon={<Clock />}
          />

          <Kpi
            title="Completed Trades"
            value={dashboardData.stats.completedTrades}
            trend="Recorded transactions"
            icon={<CheckCircle />}
          />
        </section>

        <section className="pro-grid">
          <div className="pro-card wide">
            <div className="card-head">
              <div>
                <h3>Verification Queue</h3>
                <p>
                  Review submitted documents and approve or flag transactions.
                </p>
              </div>

              <button>View All</button>
            </div>

            <table className="pro-table">
              <thead>
                <tr>
                  <th>Farmer</th>
                  <th>Livestock</th>
                  <th>Document</th>
                  <th>Workflow</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {dashboardData.verificationQueue.length === 0 ? (
                  <tr>
                    <td colSpan="6">No verification records yet.</td>
                  </tr>
                ) : (
                  dashboardData.verificationQueue.map((item) => (
                    <tr key={item.id}>
                      <td>{item.farmer_name}</td>
                      <td>{item.livestock_type}</td>
                      <td>{item.health_status || "Health Document"}</td>
                      <td>
                        <Workflow step="Verification" />
                      </td>
                      <td>
                        <span
                          className={
                            item.status === "Available"
                              ? "badge approved"
                              : item.status === "Pending"
                              ? "badge pending"
                              : "badge flagged"
                          }
                        >
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <button className="table-btn">
                          <Eye size={17} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="pro-card">
            <h3>System Activity</h3>

            {dashboardData.activity.length === 0 ? (
              <p>No system activity yet.</p>
            ) : (
              dashboardData.activity.map((item, index) => (
                <Activity
                  key={index}
                  icon={
                    item.status === "Available" ? (
                      <CheckCircle />
                    ) : item.status === "Pending" ? (
                      <AlertTriangle />
                    ) : (
                      <Users />
                    )
                  }
                  title={`${item.livestock_type} listing`}
                  text={`${item.farmer_name} posted ${item.breed}.`}
                />
              ))
            )}
          </div>
        </section>

        <section className="pro-grid bottom">
          <div className="pro-card">
            <div className="card-head">
              <div>
                <h3>Map Monitoring</h3>
                <p>Seller and farm location overview.</p>
              </div>

              <MapPin size={22} />
            </div>

            <div className="pro-map">
              <div className="pin p1"></div>
              <div className="pin p2"></div>
              <div className="pin p3"></div>

              <div className="map-info">
                <strong>Veruela, Agusan del Sur</strong>
                <p>{dashboardData.stats.sellerLocations} registered seller locations</p>
              </div>
            </div>
          </div>

          <div className="pro-card">
            <div className="card-head">
              <div>
                <h3>Reports Overview</h3>
                <p>Quick access to printable monitoring reports.</p>
              </div>

              <BarChart3 size={22} />
            </div>

            <div className="report-row">
              <strong>Monthly Sales Report</strong>
              <span>Ready</span>
            </div>

            <div className="report-row">
              <strong>Livestock Category Summary</strong>
              <span>Ready</span>
            </div>

            <div className="report-row">
              <strong>Pending Verification Report</strong>
              <span>Draft</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Kpi({ title, value, trend, icon }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon">{icon}</div>
      <h2>{value}</h2>
      <p>{title}</p>
      <small>{trend}</small>
    </div>
  );
}

function Workflow({ step }) {
  return (
    <div className="workflow">
      <span className="done"></span>
      <span className="done"></span>
      <span className={step === "Negotiation" ? "active" : "done"}></span>
      <span className={step === "Verification" ? "active" : "done"}></span>
      <span className={step === "Confirmation" ? "active" : ""}></span>
    </div>
  );
}

function Activity({ icon, title, text }) {
  return (
    <div className="activity-row">
      <div>{icon}</div>

      <section>
        <strong>{title}</strong>
        <p>{text}</p>
      </section>
    </div>
  );
}

export default AdminDashboard;