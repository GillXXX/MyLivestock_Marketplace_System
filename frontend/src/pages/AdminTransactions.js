import { useEffect, useState } from "react";

import {
  Search,
  Eye,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Download,
  CheckCircle,
  Clock,
  FileCheck2,
  Flag,
  MoreHorizontal,
  TrendingUp,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import "./AdminTransactions.css";

function AdminTransactions() {
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({
    completed: 0,
    pending: 0,
    flagged: 0,
    tradeValue: 0,
  });

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [livestockFilter, setLivestockFilter] = useState("All Livestock");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch("http://localhost:5000/api/admin/transactions", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Failed to load transactions");
        setLoading(false);
        return;
      }

      setTransactions(data.transactions);
      setStats(data.stats);
      setLoading(false);
    } catch (error) {
      setMessage("Cannot connect to backend server");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `http://localhost:5000/api/admin/transactions/${id}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to update transaction");
        return;
      }

      fetchTransactions();
    } catch (error) {
      alert("Cannot connect to backend server");
    }
  };

  const filteredTransactions = transactions.filter((trx) => {
    const search = searchText.toLowerCase();

    const matchesSearch =
      trx.id?.toString().includes(search) ||
      trx.livestock_type?.toLowerCase().includes(search) ||
      trx.breed?.toLowerCase().includes(search) ||
      trx.seller_name?.toLowerCase().includes(search) ||
      trx.buyer_name?.toLowerCase().includes(search);

    const matchesStatus =
      statusFilter === "All Status" || trx.status === statusFilter;

    const matchesLivestock =
      livestockFilter === "All Livestock" ||
      trx.livestock_type === livestockFilter;

    return matchesSearch && matchesStatus && matchesLivestock;
  });

  if (loading) {
    return <h2 style={{ padding: "30px" }}>Loading transactions...</h2>;
  }

  if (message) {
    return <h2 style={{ padding: "30px", color: "red" }}>{message}</h2>;
  }

  return (
    <div className="admin-transactions-page">
      <header className="transactions-top">
        <div className="title-area">
          <Link to="/admin-dashboard" className="back-btn">
            <ArrowLeft size={20} />
          </Link>

          <div>
            <span>MAO Transaction Monitoring</span>
            <h1>Transaction Management</h1>
            <p>
              Track livestock trades from inquiry to completion and monitor
              suspicious or pending transactions.
            </p>
          </div>
        </div>

        <button className="export-btn" type="button">
          <Download size={18} />
          Export Report
        </button>
      </header>

      <section className="transaction-stats">
        <StatCard
          icon={<FileCheck2 />}
          value={stats.completed}
          label="Completed"
          trend="Completed transactions"
        />

        <StatCard
          icon={<Clock />}
          value={stats.pending}
          label="Pending"
          trend="Awaiting verification"
        />

        <StatCard
          icon={<AlertTriangle />}
          value={stats.flagged}
          label="Flagged"
          trend="Needs MAO review"
        />

        <StatCard
          icon={<TrendingUp />}
          value={`₱${Number(stats.tradeValue).toLocaleString()}`}
          label="Trade Value"
          trend="Recorded sales"
        />
      </section>

      <section className="workflow-overview">
        <div>
          <h3>Structured Trading Workflow</h3>
          <p>Every livestock transaction must pass these required stages.</p>
        </div>

        <div className="workflow-steps">
          <div>Inquiry</div>
          <div>Negotiation</div>
          <div>Verification</div>
          <div>Confirmation</div>
          <div>Completed</div>
        </div>
      </section>

      <section className="transaction-toolbar">
        <div className="transaction-search">
          <Search size={18} />

          <input
            placeholder="Search transaction, buyer, seller..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option>All Status</option>
          <option>Completed</option>
          <option>Pending</option>
          <option>Flagged</option>
        </select>

        <select
          value={livestockFilter}
          onChange={(e) => setLivestockFilter(e.target.value)}
        >
          <option>All Livestock</option>
          <option>Swine</option>
          <option>Cattle</option>
          <option>Goat</option>
          <option>Poultry</option>
        </select>

        <button className="date-btn" type="button">
          <Calendar size={17} />
          Date Filter
        </button>
      </section>

      <section className="transactions-card">
        <div className="card-header">
          <div>
            <h3>Transaction Records</h3>
            <p>Monitor complete transaction history and workflow progress.</p>
          </div>

          <MoreHorizontal size={22} />
        </div>

        <div className="table-responsive">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Transaction</th>
                <th>Livestock</th>
                <th>Parties</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Workflow</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="8">No transaction records found.</td>
                </tr>
              ) : (
                filteredTransactions.map((trx) => (
                  <tr key={trx.id}>
                    <td>
                      <strong>TRX-{trx.id}</strong>
                      <small>Marketplace trade</small>
                    </td>

                    <td>{trx.livestock_type}</td>

                    <td>
                      <strong>{trx.seller_name}</strong>
                      <small>Buyer: {trx.buyer_name}</small>
                    </td>

                    <td className="amount">
                      ₱{Number(trx.amount).toLocaleString()}
                    </td>

                    <td>{new Date(trx.created_at).toLocaleDateString()}</td>

                    <td>
                      <Workflow stage={trx.workflow_step} />
                      <small className="stage-label">{trx.workflow_step}</small>
                    </td>

                    <td>
                      <span className={`trx-status ${trx.status.toLowerCase()}`}>
                        {trx.status}
                      </span>
                    </td>

                    <td>
                      <div className="transaction-actions">
                        <button title="View" type="button">
                          <Eye size={17} />
                        </button>

                        <button
                          title="Approve"
                          type="button"
                          onClick={() => updateStatus(trx.id, "Completed")}
                        >
                          <CheckCircle size={17} />
                        </button>

                        <button
                          title="Flag"
                          type="button"
                          onClick={() => updateStatus(trx.id, "Flagged")}
                        >
                          <Flag size={17} />
                        </button>

                        <button
                          className="danger"
                          title="Issue"
                          type="button"
                          onClick={() => updateStatus(trx.id, "Pending")}
                        >
                          <AlertTriangle size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon, value, label, trend }) {
  return (
    <div className="transaction-stat-card">
      <div className="stat-icon">{icon}</div>
      <h2>{value}</h2>
      <p>{label}</p>
      <small>{trend}</small>
    </div>
  );
}

function Workflow({ stage }) {
  const steps = ["Inquiry", "Negotiation", "Verification", "Confirmation", "Completed"];
  const activeIndex = steps.indexOf(stage);

  return (
    <div className="workflow-box">
      {steps.map((step, index) => (
        <span
          key={step}
          className={
            index < activeIndex ? "done" : index === activeIndex ? "active" : ""
          }
        ></span>
      ))}
    </div>
  );
}

export default AdminTransactions;