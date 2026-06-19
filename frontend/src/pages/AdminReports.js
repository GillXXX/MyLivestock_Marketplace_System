import { useEffect, useState } from "react";

import {
  ArrowLeft,
  BarChart3,
  Users,
  ShoppingBag,
  TrendingUp,
  Download,
  Printer,
  Calendar,
  FileSpreadsheet,
  PieChart,
  Filter,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import "./AdminReports.css";

function AdminReports() {
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState({
    totalFarmers: 0,
    totalBuyers: 0,
    livestockSold: 0,
    tradeValue: 0,
  });

  const [livestockData, setLivestockData] = useState([]);
  const [verification, setVerification] = useState({
    approved: 0,
    pending: 0,
    rejected: 0,
  });

  const [monthlyTransactions, setMonthlyTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const res = await fetch("http://localhost:5000/api/admin/reports", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          setMessage(data.message || "Failed to load reports");
          setLoading(false);
          return;
        }

        setMetrics(data.metrics);
        setLivestockData(data.livestockData);
        setVerification(data.verification);
        setMonthlyTransactions(data.monthlyTransactions);
        setLoading(false);
      } catch (error) {
        setMessage("Cannot connect to backend server");
        setLoading(false);
      }
    };

    fetchReports();
  }, [navigate]);

  if (loading) {
    return <h2 style={{ padding: "30px" }}>Loading reports...</h2>;
  }

  if (message) {
    return <h2 style={{ padding: "30px", color: "red" }}>{message}</h2>;
  }

  return (
    <div className="reports-page">
      <header className="reports-hero">
        <Link to="/admin-dashboard" className="back-btn">
          <ArrowLeft size={20} />
        </Link>

        <div>
          <span className="eyebrow">MAO Monitoring and Analytics</span>
          <h1>Reports & Analytics</h1>
          <p>
            Generate official summaries for livestock trading activities,
            users, verifications, and recorded transactions in Veruela.
          </p>
        </div>
      </header>

      <section className="report-actions">
        <div className="filter-box">
          <Calendar size={18} />
          <select>
            <option>Current Month</option>
            <option>Previous Month</option>
          </select>
        </div>

        <div className="filter-box">
          <Filter size={18} />
          <select>
            <option>All Livestock</option>
            <option>Swine</option>
            <option>Cattle</option>
            <option>Goat</option>
            <option>Poultry</option>
          </select>
        </div>

        <button className="primary-action" type="button">
          <Download size={18} />
          Export PDF
        </button>

        <button className="secondary-action" type="button">
          <FileSpreadsheet size={18} />
          Export Excel
        </button>

        <button className="print-action" type="button" onClick={() => window.print()}>
          <Printer size={18} />
          Print
        </button>
      </section>

      <section className="analytics-grid">
        <MetricCard
          icon={<Users />}
          label="Total Farmers"
          value={metrics.totalFarmers}
          change="Registered farmer accounts"
        />

        <MetricCard
          icon={<ShoppingBag />}
          label="Total Buyers"
          value={metrics.totalBuyers}
          change="Registered buyer accounts"
        />

        <MetricCard
          icon={<BarChart3 />}
          label="Livestock Sold"
          value={metrics.livestockSold}
          change="Completed transactions"
        />

        <MetricCard
          icon={<TrendingUp />}
          label="Trade Value"
          value={`₱${Number(metrics.tradeValue).toLocaleString()}`}
          change="Recorded completed sales"
        />
      </section>

      <section className="reports-layout">
        <div className="report-card large">
          <div className="card-title">
            <div>
              <h3>Livestock Performance</h3>
              <p>Breakdown of listings and transactions by livestock type.</p>
            </div>

            <PieChart size={24} />
          </div>

          <div className="livestock-performance">
            {livestockData.length === 0 ? (
              <p>No livestock data available.</p>
            ) : (
              livestockData.map((item) => (
                <div className="performance-row" key={item.type}>
                  <div>
                    <strong>{item.type}</strong>
                    <p>
                      {item.total} records • ₱{Number(item.value).toLocaleString()}
                    </p>
                  </div>

                  <div className="progress-area">
                    <span>{item.percent}</span>
                    <div className="progress-bar">
                      <div style={{ width: item.percent }}></div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="report-card">
          <div className="card-title">
            <div>
              <h3>Report Status</h3>
              <p>Generated monitoring documents.</p>
            </div>

            <FileText size={24} />
          </div>

          <ReportItem title="Monthly Sales Report" status="Ready" />
          <ReportItem title="Livestock Category Report" status="Ready" />
          <ReportItem title="Verification Report" status="Ready" />
          <ReportItem title="User Registration Report" status="Ready" />
        </div>
      </section>

      <section className="reports-layout bottom">
        <div className="report-card">
          <div className="card-title">
            <div>
              <h3>Verification Summary</h3>
              <p>Status of submitted livestock documents.</p>
            </div>
          </div>

          <StatusSummary
            icon={<CheckCircle />}
            title="Approved Documents"
            value={verification.approved}
            type="success"
          />

          <StatusSummary
            icon={<Clock />}
            title="Pending Review"
            value={verification.pending}
            type="warning"
          />

          <StatusSummary
            icon={<AlertTriangle />}
            title="Rejected / Flagged"
            value={verification.rejected}
            type="danger"
          />
        </div>

        <div className="report-card large">
          <div className="card-title">
            <div>
              <h3>Monthly Transaction Report</h3>
              <p>Official transaction summary for selected period.</p>
            </div>
          </div>

          <div className="table-responsive">
            <table className="professional-table">
              <thead>
                <tr>
                  <th>Livestock</th>
                  <th>Completed</th>
                  <th>Pending</th>
                  <th>Flagged</th>
                  <th>Total Value</th>
                </tr>
              </thead>

              <tbody>
                {monthlyTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="5">No transaction data available.</td>
                  </tr>
                ) : (
                  monthlyTransactions.map((item) => (
                    <tr key={item.livestock_type}>
                      <td>{item.livestock_type}</td>
                      <td>{item.completed}</td>
                      <td>{item.pending}</td>
                      <td>{item.flagged}</td>
                      <td>₱{Number(item.totalValue).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ icon, label, value, change }) {
  return (
    <div className="metric-card">
      <div className="metric-icon">{icon}</div>
      <h2>{value}</h2>
      <p>{label}</p>
      <small>{change}</small>
    </div>
  );
}

function ReportItem({ title, status }) {
  return (
    <div className="report-item">
      <div>
        <strong>{title}</strong>
        <p>Generated report file</p>
      </div>

      <span className={status === "Ready" ? "ready" : "draft"}>
        {status}
      </span>
    </div>
  );
}

function StatusSummary({ icon, title, value, type }) {
  return (
    <div className={`status-summary ${type}`}>
      <div>{icon}</div>

      <section>
        <strong>{title}</strong>
        <p>{value} records</p>
      </section>
    </div>
  );
}

export default AdminReports;