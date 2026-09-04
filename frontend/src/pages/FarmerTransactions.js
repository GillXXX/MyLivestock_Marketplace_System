import { useEffect, useState } from "react";

import {
  ArrowLeft,
  Search,
  FileCheck2,
  Clock,
  CheckCircle,
  AlertTriangle,
  MessageCircle,
  MapPin,
  ShieldCheck,
  Calendar,
  Wallet,
  TrendingUp,
  XCircle,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import "./FarmerTransactions.css";

function FarmerTransactions() {
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    pendingDeals: 0,
    completed: 0,
    tradeValue: 0,
  });

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [typeFilter, setTypeFilter] = useState("All Livestock");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch(`${API_URL}/api/farmer/transactions`, {
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
      setFilteredTransactions(data.transactions);
      setStats(data.stats);
      setLoading(false);
    } catch (error) {
      setMessage("Cannot connect to backend server");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const WORKFLOW_STEPS = ["Inquiry", "Negotiation", "Verification", "Confirmation", "Completed"];

  const advanceStep = async (id) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_URL}/api/farmer/transactions/${id}/advance`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to advance transaction");
        return;
      }

      fetchTransactions();
    } catch (error) {
      alert("Cannot connect to backend server");
    }
  };

  const declineOffer = async (id) => {
    if (!window.confirm("Decline this offer? This cannot be undone.")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_URL}/api/farmer/transactions/${id}/decline`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to decline transaction");
        return;
      }

      fetchTransactions();
    } catch (error) {
      alert("Cannot connect to backend server");
    }
  };

  useEffect(() => {
    let results = [...transactions];

    if (searchText.trim() !== "") {
      const search = searchText.toLowerCase();

      results = results.filter(
        (item) =>
          item.breed?.toLowerCase().includes(search) ||
          item.livestock_type?.toLowerCase().includes(search) ||
          item.buyer_name?.toLowerCase().includes(search) ||
          item.location?.toLowerCase().includes(search)
      );
    }

    if (statusFilter !== "All Status") {
      results = results.filter(
        (item) =>
          item.status === statusFilter ||
          item.workflow_step === statusFilter
      );
    }

    if (typeFilter !== "All Livestock") {
      results = results.filter((item) => item.livestock_type === typeFilter);
    }

    setFilteredTransactions(results);
  }, [searchText, statusFilter, typeFilter, transactions]);

  if (loading) {
    return <h2 style={{ padding: "30px" }}>Loading transactions...</h2>;
  }

  if (message) {
    return <h2 style={{ padding: "30px", color: "red" }}>{message}</h2>;
  }

  return (
    <div className="farmer-transactions-page">
      <header className="transactions-header">
        <div className="header-left">
          <Link to="/farmer-dashboard" className="back-btn">
            <ArrowLeft size={20} />
          </Link>

          <div>
            <span className="page-tag">FARMER TRANSACTION CENTER</span>
            <h1>My Sales</h1>
            <p>
              Track buyer inquiries, negotiations, verification progress,
              and completed livestock sales.
            </p>
          </div>
        </div>
      </header>

      <section className="transaction-stats">
        <StatCard
          icon={<FileCheck2 />}
          value={stats.totalTransactions}
          label="Total Transactions"
          note="All sale records"
        />

        <StatCard
          icon={<Clock />}
          value={stats.pendingDeals}
          label="Pending Deals"
          note="Awaiting next step"
        />

        <StatCard
          icon={<CheckCircle />}
          value={stats.completed}
          label="Completed"
          note="Recorded sales"
        />

        <StatCard
          icon={<Wallet />}
          value={`₱${Number(stats.tradeValue).toLocaleString()}`}
          label="Trade Value"
          note="Total completed value"
        />
      </section>

      <section className="transaction-toolbar">
        <div className="transaction-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search transaction, buyer, livestock..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option>All Status</option>
          <option>Pending</option>
          <option>Verification</option>
          <option>Completed</option>
          <option>Flagged</option>
        </select>

        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option>All Livestock</option>
          <option>Swine</option>
          <option>Cattle</option>
          <option>Goat</option>
          <option>Poultry</option>
        </select>
      </section>

      <section className="transactions-layout">
        <div className="transactions-card">
          <div className="card-header">
            <div>
              <h3>Sales Transaction Records</h3>
              <p>Monitor every livestock deal through the structured workflow.</p>
            </div>
          </div>

          <div className="transaction-list">
            {filteredTransactions.length === 0 ? (
              <p>No transactions found.</p>
            ) : (
              filteredTransactions.map((item) => (
                <div className="premium-transaction-card" key={item.id}>
                  <div className="transaction-top">
                    <div className="transaction-left">
                      <div className="transaction-icon-box">
                        <FileCheck2 size={24} />
                      </div>

                      <div>
                        <div className="transaction-heading">
                          <h3>{item.breed || item.livestock_type}</h3>

                          <span className="transaction-id">
                            TRX-{String(item.id).padStart(3, "0")}
                          </span>
                        </div>

                        <p className="buyer-name">
                          Buyer: {item.buyer_name}
                        </p>

                        <div className="transaction-meta">
                          <span>
                            <MapPin size={14} />
                            {item.location}
                          </span>

                          <span>
                            <Calendar size={14} />
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="transaction-right">
                      <strong>₱{Number(item.amount).toLocaleString()}</strong>

                      <span
                        className={
                          item.status === "Completed"
                            ? "premium-status completed"
                            : item.status === "Declined" || item.status === "Cancelled"
                            ? "premium-status declined"
                            : item.workflow_step === "Verification"
                            ? "premium-status verification"
                            : "premium-status pending"
                        }
                      >
                        {item.status === "Completed" || item.status === "Declined" || item.status === "Cancelled"
                          ? item.status
                          : item.workflow_step}
                      </span>
                    </div>
                  </div>

                  <div className="transaction-center">
                    <div className="workflow-wrapper">
                      <div className="workflow-header">
                        <h4>Transaction Workflow</h4>
                        <p>Current Stage: {item.workflow_step}</p>
                      </div>

                      <Workflow stage={item.workflow_step} />
                    </div>
                  </div>

                  <div className="transaction-footer">
                    <div className="transaction-info-box">
                      <ShieldCheck size={18} />

                      <div>
                        <strong>MAO Verified Transaction</strong>
                        <p>
                          Livestock documents and buyer details are validated
                          before final confirmation.
                        </p>
                      </div>
                    </div>

                    <div className="premium-actions">
                      <Link className="message-btn-premium" to="/farmer-messages">
                        <MessageCircle size={17} />
                        Message Buyer
                      </Link>

                      {item.status === "Pending" && item.workflow_step !== "Confirmation" && (
                        <button
                          type="button"
                          className="message-btn-premium"
                          onClick={() => advanceStep(item.id)}
                        >
                          <CheckCircle size={17} />
                          Advance to {WORKFLOW_STEPS[WORKFLOW_STEPS.indexOf(item.workflow_step) + 1]}
                        </button>
                      )}

                      {item.status === "Pending" && item.workflow_step === "Confirmation" && (
                        <span className="waiting-buyer-note">Waiting for buyer to confirm</span>
                      )}

                      {item.status === "Pending" && (
                        <button
                          type="button"
                          className="decline-btn-premium"
                          onClick={() => declineOffer(item.id)}
                        >
                          <XCircle size={17} />
                          Decline Offer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <aside className="transaction-side-panel">
          <div className="side-panel-card">
            <h3>Trading Workflow</h3>
            <p>
              Each livestock transaction follows a structured process before it
              becomes a completed record.
            </p>

            <div className="workflow-guide">
              <GuideItem number="1" title="Inquiry" text="Buyer sends interest to your listing." />
              <GuideItem number="2" title="Negotiation" text="Price and terms are discussed." />
              <GuideItem number="3" title="Verification" text="MAO reviews documents." />
              <GuideItem number="4" title="Confirmation" text="Both parties confirm the deal." />
              <GuideItem number="5" title="Completed" text="Transaction is recorded." />
            </div>
          </div>

          <div className="side-panel-card">
            <h3>Transaction Health</h3>

            <HealthItem
              icon={<ShieldCheck />}
              title="MAO Monitored"
              text="All transactions are visible to MAO for verification."
            />

            <HealthItem
              icon={<TrendingUp />}
              title="Transparent Pricing"
              text="Your listed price is visible before negotiation."
            />

            <HealthItem
              icon={<AlertTriangle />}
              title="Report Issue"
              text="Contact MAO if a buyer transaction looks suspicious."
            />
          </div>
        </aside>
      </section>
    </div>
  );
}

function StatCard({ icon, value, label, note }) {
  return (
    <div className="transaction-stat-card">
      <div className="stat-icon">{icon}</div>
      <h2>{value}</h2>
      <p>{label}</p>
      <small>{note}</small>
    </div>
  );
}

function Workflow({ stage }) {
  const steps = ["Inquiry", "Negotiation", "Verification", "Confirmation", "Completed"];
  const activeIndex = steps.indexOf(stage);

  return (
    <div className="workflow-line">
      {steps.map((step, index) => (
        <span
          key={step}
          className={
            index < activeIndex
              ? "done"
              : index === activeIndex
              ? "active"
              : ""
          }
        ></span>
      ))}
    </div>
  );
}

function GuideItem({ number, title, text }) {
  return (
    <div className="guide-item">
      <span>{number}</span>

      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

function HealthItem({ icon, title, text }) {
  return (
    <div className="health-item">
      <div>{icon}</div>

      <section>
        <strong>{title}</strong>
        <p>{text}</p>
      </section>
    </div>
  );
}

export default FarmerTransactions;
