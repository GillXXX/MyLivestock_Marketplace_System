import { useEffect, useRef, useState } from "react";

import {
  ArrowLeft,
  Search,
  FileCheck2,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  Download,
  MessageCircle,
  MapPin,
  ShieldCheck,
  Calendar,
  Wallet,
  TrendingUp,
  XCircle,
  X,
  Beef,
  Drumstick,
  PawPrint,
  Inbox,
} from "lucide-react";

import { Link, useLocation, useNavigate } from "react-router-dom";
import { exportToCsv } from "../utils/exportCsv";
import { API_URL } from "../config";
import "./BuyerTransactions.css";

const LIVESTOCK_ICONS = {
  Cattle: Beef,
  Poultry: Drumstick,
  Goat: PawPrint,
  Swine: PawPrint,
};

const getLivestockIcon = (type) => LIVESTOCK_ICONS[type] || FileCheck2;

function useCountUp(target, durationMs = 700) {
  const [value, setValue] = useState(0);
  const frameRef = useRef();

  useEffect(() => {
    const numericTarget = Number(target) || 0;
    const startTime = performance.now();
    const startValue = 0;

    const tick = (now) => {
      const progress = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(startValue + (numericTarget - startValue) * eased);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        setValue(numericTarget);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, durationMs]);

  return value;
}

function BuyerTransactions() {
  const navigate = useNavigate();
  const location = useLocation();

  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    pendingDeals: 0,
    completed: 0,
    purchaseValue: 0,
  });

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [typeFilter, setTypeFilter] = useState("All Livestock");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const animatedTotal = useCountUp(stats.totalTransactions);
  const animatedPending = useCountUp(stats.pendingDeals);
  const animatedCompleted = useCountUp(stats.completed);
  const animatedValue = useCountUp(stats.purchaseValue);

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch(`${API_URL}/api/buyer-transactions`, {
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

      const requestedId = location.state?.transactionId;
      if (requestedId) {
        const match = data.transactions.find((t) => t.id === requestedId);
        if (match) setSelectedTransaction(match);
        navigate(location.pathname, { replace: true, state: {} });
      }
    } catch (error) {
      setMessage("Cannot connect to backend server");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const confirmCompletion = async (id) => {
    if (!window.confirm("Confirm this transaction is complete? This will finalize the sale.")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_URL}/api/buyer-transactions/${id}/confirm`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to confirm transaction");
        return;
      }

      fetchTransactions();
    } catch (error) {
      alert("Cannot connect to backend server");
    }
  };

  const cancelOffer = async (id) => {
    if (!window.confirm("Cancel this offer? This cannot be undone.")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_URL}/api/buyer-transactions/${id}/cancel`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to cancel offer");
        return;
      }

      fetchTransactions();
    } catch (error) {
      alert("Cannot connect to backend server");
    }
  };

  const transactionCsvColumns = [
    { label: "Transaction ID", value: (t) => `TRX-${String(t.id).padStart(3, "0")}` },
    { label: "Livestock", value: (t) => t.livestock_type },
    { label: "Breed", value: (t) => t.breed || "" },
    { label: "Seller", value: (t) => t.seller_name },
    { label: "Location", value: (t) => t.location },
    { label: "Amount", value: (t) => t.amount },
    { label: "Status", value: (t) => t.status },
    { label: "Workflow Step", value: (t) => t.workflow_step },
    { label: "Date", value: (t) => new Date(t.created_at).toLocaleDateString() },
  ];

  const handleExportAll = () => {
    exportToCsv("my-transactions.csv", transactionCsvColumns, filteredTransactions);
  };

  const handleDownloadReceipt = (item) => {
    exportToCsv(
      `receipt-TRX-${String(item.id).padStart(3, "0")}.csv`,
      transactionCsvColumns,
      [item]
    );
  };

  useEffect(() => {
    let results = [...transactions];

    if (searchText.trim() !== "") {
      const search = searchText.toLowerCase();

      results = results.filter(
        (item) =>
          item.breed?.toLowerCase().includes(search) ||
          item.livestock_type?.toLowerCase().includes(search) ||
          item.seller_name?.toLowerCase().includes(search) ||
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
    return (
      <div className="buyer-transactions-page">
        <div className="skeleton-header">
          <div className="skeleton-block skeleton-btn"></div>
          <div>
            <div className="skeleton-block skeleton-tag"></div>
            <div className="skeleton-block skeleton-title"></div>
          </div>
        </div>

        <div className="skeleton-stats">
          {[0, 1, 2, 3].map((i) => (
            <div className="skeleton-block skeleton-stat-card" key={i}></div>
          ))}
        </div>

        <div className="skeleton-block skeleton-toolbar"></div>

        {[0, 1, 2].map((i) => (
          <div className="skeleton-block skeleton-transaction-card" key={i}></div>
        ))}
      </div>
    );
  }

  if (message) {
    return <h2 style={{ padding: "30px", color: "red" }}>{message}</h2>;
  }

  return (
    <div className="buyer-transactions-page">
      <header className="transactions-header">
        <div className="header-left">
          <Link to="/buyer-dashboard" className="back-btn">
            <ArrowLeft size={20} />
          </Link>

          <div>
            <span className="page-tag">BUYER TRANSACTION CENTER</span>
            <h1>My Transactions</h1>
            <p>
              Track livestock inquiries, negotiations, verification progress,
              and completed purchase records.
            </p>
          </div>
        </div>
      </header>

      <section className="transaction-stats">
        <StatCard
          icon={<FileCheck2 />}
          value={Math.round(animatedTotal)}
          label="Total Transactions"
          note="All purchase records"
          accent="neutral"
        />

        <StatCard
          icon={<Clock />}
          value={Math.round(animatedPending)}
          label="Pending Deals"
          note="Awaiting seller action"
          accent="amber"
          pulse={stats.pendingDeals > 0}
        />

        <StatCard
          icon={<CheckCircle />}
          value={Math.round(animatedCompleted)}
          label="Completed"
          note="Recorded purchases"
          accent="green"
        />

        <StatCard
          icon={<Wallet />}
          value={`₱${Math.round(animatedValue).toLocaleString()}`}
          label="Purchase Value"
          note="Total estimated value"
          accent="neutral"
        />
      </section>

      <section className="transaction-toolbar">
        <div className="transaction-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search transaction, seller, livestock..."
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
              <h3>Purchase Transaction Records</h3>
              <p>Monitor every livestock deal through the structured workflow.</p>
            </div>

            <button
              className="export-btn"
              type="button"
              onClick={handleExportAll}
              disabled={filteredTransactions.length === 0}
            >
              <Download size={17} />
              Export
            </button>
          </div>

          <div className="transaction-list">
            {filteredTransactions.length === 0 ? (
              <div className="transactions-empty-state">
                <Inbox size={40} />
                <h4>No transactions found</h4>
                <p>
                  {transactions.length === 0
                    ? "Inquire or make an offer on a listing to start your first transaction."
                    : "Try adjusting your search or filters."}
                </p>
                {transactions.length === 0 && (
                  <Link to="/marketplace" className="empty-state-cta">
                    Browse Marketplace
                  </Link>
                )}
              </div>
            ) : (
              filteredTransactions.map((item, index) => {
                const LivestockIcon = getLivestockIcon(item.livestock_type);

                return (
                <div
                  className="premium-transaction-card"
                  key={item.id}
                  style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
                >
                  <div className="transaction-top">
                    <div className="transaction-left">
                      <div className="transaction-icon-box">
                        <LivestockIcon size={24} />
                      </div>

                      <div>
                        <div className="transaction-heading">
                          <h3>{item.livestock_type}</h3>

                          <span className="transaction-id">
                            TRX-{String(item.id).padStart(3, "0")}
                          </span>
                        </div>

                        <p className="seller-name">
                          Seller: {item.seller_name}
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
                        {item.status === "Pending" && <span className="status-pulse-dot"></span>}
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
                          Livestock documents and seller credentials are validated
                          before final confirmation.
                        </p>
                      </div>
                    </div>

                    <div className="premium-actions">
                      <button
                        className="view-btn-premium"
                        type="button"
                        onClick={() => setSelectedTransaction(item)}
                      >
                        <Eye size={17} />
                        View Details
                      </button>

                      <Link className="message-btn-premium" to="/messages">
                        <MessageCircle size={17} />
                        Contact Seller
                      </Link>

                      <button
                        className="download-btn-premium"
                        type="button"
                        title="Download receipt"
                        onClick={() => handleDownloadReceipt(item)}
                      >
                        <Download size={17} />
                      </button>

                      {item.status === "Pending" && item.workflow_step === "Confirmation" && (
                        <button
                          type="button"
                          className="message-btn-premium"
                          onClick={() => confirmCompletion(item.id)}
                        >
                          <CheckCircle size={17} />
                          Confirm & Complete
                        </button>
                      )}

                      {item.status === "Pending" && (
                        <button
                          type="button"
                          className="decline-btn-premium"
                          onClick={() => cancelOffer(item.id)}
                        >
                          <XCircle size={17} />
                          Cancel Offer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                );
              })
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
              <GuideItem number="1" title="Inquiry" text="Buyer sends interest to seller." />
              <GuideItem number="2" title="Negotiation" text="Price and terms are discussed." />
              <GuideItem number="3" title="Verification" text="Documents are reviewed." />
              <GuideItem number="4" title="Confirmation" text="Both parties confirm deal." />
              <GuideItem number="5" title="Completed" text="Transaction is recorded." />
            </div>
          </div>

          <div className="side-panel-card">
            <h3>Transaction Health</h3>

            <HealthItem
              icon={<ShieldCheck />}
              title="Verified Sellers"
              text="All listed sellers are monitored by MAO."
            />

            <HealthItem
              icon={<TrendingUp />}
              title="Transparent Pricing"
              text="Prices are visible before negotiation."
            />

            <HealthItem
              icon={<AlertTriangle />}
              title="Report Issue"
              text="Flag suspicious or incomplete transactions."
            />
          </div>
        </aside>
      </section>

      {selectedTransaction && (
        <div
          className="transaction-modal-overlay"
          onClick={() => setSelectedTransaction(null)}
        >
          <div className="transaction-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="transaction-modal-close"
              type="button"
              onClick={() => setSelectedTransaction(null)}
            >
              <X size={20} />
            </button>

            <div className="transaction-modal-head">
              <div className="transaction-icon-box">
                {(() => {
                  const ModalIcon = getLivestockIcon(selectedTransaction.livestock_type);
                  return <ModalIcon size={26} />;
                })()}
              </div>

              <div>
                <div className="transaction-heading">
                  <h3>{selectedTransaction.livestock_type}</h3>
                  <span className="transaction-id">
                    TRX-{String(selectedTransaction.id).padStart(3, "0")}
                  </span>
                </div>
                <p className="seller-name">Seller: {selectedTransaction.seller_name}</p>
              </div>
            </div>

            <div className="transaction-modal-amount">
              <span>Offer Amount</span>
              <strong>₱{Number(selectedTransaction.amount).toLocaleString()}</strong>
            </div>

            <div className="transaction-modal-info">
              <div>
                <MapPin size={16} />
                <span>{selectedTransaction.location}</span>
              </div>
              <div>
                <Calendar size={16} />
                <span>{new Date(selectedTransaction.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="workflow-wrapper">
              <div className="workflow-header">
                <h4>Transaction Workflow</h4>
                <p>Current Stage: {selectedTransaction.workflow_step}</p>
              </div>

              <Workflow stage={selectedTransaction.workflow_step} />
            </div>

            <Link
              className="message-btn-premium transaction-modal-contact"
              to="/messages"
            >
              <MessageCircle size={17} />
              Contact Seller
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, value, label, note, accent = "neutral", pulse }) {
  return (
    <div className={`transaction-stat-card accent-${accent}`}>
      <div className="stat-icon">
        {icon}
        {pulse && <span className="stat-pulse-dot"></span>}
      </div>
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

export default BuyerTransactions;