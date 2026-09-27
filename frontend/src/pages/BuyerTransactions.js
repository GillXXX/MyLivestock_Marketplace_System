import { Fragment, useEffect, useRef, useState } from "react";

import {
  ArrowLeft,
  Search,
  FileCheck2,
  Clock,
  CheckCircle,
  CheckCircle2,
  Eye,
  Download,
  MessageCircle,
  MapPin,
  ShieldCheck,
  Calendar,
  Wallet,
  XCircle,
  X,
  Inbox,
  Handshake,
  ClipboardCheck,
  ChevronRight,
} from "lucide-react";

import { Link, useLocation, useNavigate } from "react-router-dom";
import { exportToCsv } from "../utils/exportCsv";
import AdminStatCard from "../components/AdminStatCard";
import { API_URL } from "../config";
import {
  LIVESTOCK_TYPES,
  FARM_PRODUCT_TYPES,
  ALL_KNOWN_TYPES,
  getProductIcon,
  formatQuantity,
} from "../utils/productCatalog";
import useGoBack from "../utils/useGoBack";
import "./BuyerTransactions.css";

const WORKFLOW_STAGES = [
  {
    title: "Inquiry",
    text: "Buyer expresses interest in a listing",
    icon: <MessageCircle size={18} />,
    accent: "green",
    iconColor: "blue",
  },
  {
    title: "Negotiation",
    text: "Delivery, pickup, and other details are discussed",
    icon: <Handshake size={18} />,
    accent: "green",
    iconColor: "amber",
  },
  {
    title: "Confirmation",
    text: "Both parties confirm the deal",
    icon: <ClipboardCheck size={18} />,
    accent: "green",
    iconColor: "teal",
  },
  {
    title: "Completed",
    text: "Trade is finalized and recorded",
    icon: <CheckCircle2 size={18} />,
    accent: "green",
    iconColor: "green",
  },
];

function formatRelativeTime(time) {
  if (!time) return "";

  const diffMs = Date.now() - new Date(time).getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(time).toLocaleDateString();
}

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
  const goBack = useGoBack("/buyer-dashboard");

  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    pendingDeals: 0,
    completed: 0,
    declined: 0,
    purchaseValue: 0,
  });
  const [workflowMode, setWorkflowMode] = useState("Strict");
  const [actioningId, setActioningId] = useState(null);

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
      setWorkflowMode(data.workflowMode || "Strict");
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

    setActioningId(id);

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
        setActioningId(null);
        return;
      }

      await fetchTransactions();
    } catch (error) {
      alert("Cannot connect to backend server");
    }

    setActioningId(null);
  };

  const cancelOffer = async (id) => {
    if (!window.confirm("Cancel this offer? This cannot be undone.")) {
      return;
    }

    setActioningId(id);

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
        setActioningId(null);
        return;
      }

      await fetchTransactions();
    } catch (error) {
      alert("Cannot connect to backend server");
    }

    setActioningId(null);
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

    if (typeFilter === "Other") {
      results = results.filter((item) => !ALL_KNOWN_TYPES.includes(item.livestock_type));
    } else if (typeFilter !== "All Livestock") {
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
          <button type="button" className="back-btn" onClick={goBack} aria-label="Go back">
            <ArrowLeft size={20} />
          </button>

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
        <AdminStatCard
          icon={<FileCheck2 />}
          value={Math.round(animatedTotal)}
          label="Total Transactions"
          note="All purchase records"
        />

        <AdminStatCard
          icon={<Clock />}
          value={Math.round(animatedPending)}
          label="Pending Deals"
          note="Awaiting seller action"
        />

        <AdminStatCard
          icon={<CheckCircle />}
          value={Math.round(animatedCompleted)}
          label="Completed"
          note="Recorded purchases"
        />

        <AdminStatCard
          icon={<Wallet />}
          value={`₱${Math.round(animatedValue).toLocaleString()}`}
          label="Purchase Value"
          note="Total estimated value"
        />
      </section>

      <section className="workflow-overview">
        <div>
          <h3>Structured Trading Workflow</h3>
          <p>Every livestock transaction must pass these required stages.</p>
        </div>

        <div className="workflow-steps">
          {WORKFLOW_STAGES.map((stage, index) => (
            <Fragment key={stage.title}>
              <div className={`workflow-step accent-${stage.accent}`}>
                <div className="workflow-step-top">
                  <span className="workflow-step-number">{index + 1}</span>
                  <div className={`workflow-step-icon icon-${stage.iconColor}`}>{stage.icon}</div>
                </div>

                <strong>{stage.title}</strong>
                <p>{stage.text}</p>
              </div>

              {index < WORKFLOW_STAGES.length - 1 && (
                <ChevronRight className="workflow-chevron" size={18} />
              )}
            </Fragment>
          ))}
        </div>
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
          <option>Completed</option>
        </select>

        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="All Livestock">All Types</option>
          <optgroup label="Livestock">
            {LIVESTOCK_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </optgroup>
          <optgroup label="Farm Products">
            {FARM_PRODUCT_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </optgroup>
          <option>Other</option>
        </select>

      </section>

      <section className="transactions-card">
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

          {transactions.length > 0 && (
            <div className="transaction-breakdown">
              <span className="tone-pending">{stats.pendingDeals} Pending</span>
              <span className="tone-available">{stats.completed} Completed</span>
              {stats.declined > 0 && (
                <span className="tone-flagged">{stats.declined} Declined</span>
              )}
            </div>
          )}

          {transactions.length > 0 && (
            <p className="results-count">
              Showing {filteredTransactions.length} of {transactions.length} transaction
              {transactions.length === 1 ? "" : "s"}
            </p>
          )}

          <div className="transaction-list">
            {filteredTransactions.length === 0 ? (
              <div className="transactions-empty-state">
                <Inbox size={40} />
                <h4>No transactions found</h4>
                <p>
                  {transactions.length === 0
                    ? "Inquire or buy now on a listing to start your first transaction."
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
                const LivestockIcon = getProductIcon(item.livestock_type, item.category);
                const isTerminal = item.status === "Declined" || item.status === "Cancelled";
                const isActioning = actioningId === item.id;

                return (
                <div
                  className="premium-transaction-card"
                  key={item.id}
                  style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
                >
                  <div className="transaction-top">
                    <div className="transaction-left">
                      {item.image_url ? (
                        <img className="transaction-thumb" src={item.image_url} alt={item.breed} />
                      ) : (
                        <div className="transaction-icon-box">
                          <LivestockIcon size={22} />
                        </div>
                      )}

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

                          {item.updated_at && (
                            <span className="meta-updated">
                              Updated {formatRelativeTime(item.updated_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="transaction-right">
                      <strong>₱{Number(item.amount).toLocaleString()}</strong>
                      <span className="transaction-qty">Qty: {formatQuantity(item.quantity || 1, item.unit)}</span>

                      <span
                        className={
                          item.status === "Completed"
                            ? "premium-status completed"
                            : isTerminal
                            ? "premium-status declined"
                            : "premium-status pending"
                        }
                      >
                        {item.status === "Pending" && <span className="status-pulse-dot"></span>}
                        {item.status === "Completed" || isTerminal
                          ? item.status
                          : item.workflow_step}
                      </span>
                    </div>
                  </div>

                  <div className="transaction-center">
                    {isTerminal ? (
                      <div className="workflow-declined">
                        <XCircle size={18} />
                        <p>
                          This offer was {item.status.toLowerCase()} while at the{" "}
                          {item.workflow_step} stage.
                        </p>
                      </div>
                    ) : (
                      <div className="workflow-wrapper">
                        <div className="workflow-header">
                          <h4>Transaction Workflow</h4>
                          <p>Current Stage: {item.workflow_step}</p>
                        </div>

                        <Workflow stage={item.workflow_step} />
                      </div>
                    )}
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

                      <Link
                        className="message-btn-premium"
                        to="/buyer-messages"
                        state={item.conversation_id ? { conversationId: item.conversation_id } : undefined}
                      >
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

                      {item.status === "Pending" &&
                        (workflowMode === "Flexible"
                          ? item.workflow_step !== "Inquiry"
                          : item.workflow_step === "Confirmation") && (
                          <button
                            type="button"
                            className="message-btn-premium"
                            disabled={isActioning}
                            onClick={() => confirmCompletion(item.id)}
                          >
                            <CheckCircle size={17} />
                            {isActioning ? "Confirming..." : "Confirm & Complete"}
                          </button>
                        )}

                      {item.status === "Pending" && (
                        <button
                          type="button"
                          className="decline-btn-premium"
                          disabled={isActioning}
                          onClick={() => cancelOffer(item.id)}
                        >
                          <XCircle size={17} />
                          {isActioning ? "Cancelling..." : "Cancel Offer"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                );
              })
            )}
          </div>
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
              {selectedTransaction.image_url ? (
                <img
                  className="transaction-thumb"
                  src={selectedTransaction.image_url}
                  alt={selectedTransaction.breed}
                />
              ) : (
                <div className="transaction-icon-box">
                  {(() => {
                    const ModalIcon = getProductIcon(
                      selectedTransaction.livestock_type,
                      selectedTransaction.category
                    );
                    return <ModalIcon size={22} />;
                  })()}
                </div>
              )}

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
              {selectedTransaction.updated_at && (
                <div>
                  <Clock size={16} />
                  <span>Updated {formatRelativeTime(selectedTransaction.updated_at)}</span>
                </div>
              )}
            </div>

            {selectedTransaction.status === "Declined" || selectedTransaction.status === "Cancelled" ? (
              <div className="workflow-declined">
                <XCircle size={18} />
                <p>
                  This offer was {selectedTransaction.status.toLowerCase()} while at the{" "}
                  {selectedTransaction.workflow_step} stage.
                </p>
              </div>
            ) : (
              <div className="workflow-wrapper">
                <div className="workflow-header">
                  <h4>Transaction Workflow</h4>
                  <p>Current Stage: {selectedTransaction.workflow_step}</p>
                </div>

                <Workflow stage={selectedTransaction.workflow_step} />
              </div>
            )}

            <Link
              className="message-btn-premium transaction-modal-contact"
              to="/buyer-messages"
              state={
                selectedTransaction.conversation_id
                  ? { conversationId: selectedTransaction.conversation_id }
                  : undefined
              }
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

function Workflow({ stage }) {
  const steps = ["Inquiry", "Negotiation", "Confirmation", "Completed"];
  const activeIndex = steps.indexOf(stage);

  const stepClass = (index) =>
    index < activeIndex ? "done" : index === activeIndex ? "active" : "";

  return (
    <>
      <div className="workflow-line">
        {steps.map((step, index) => (
          <span key={step} className={stepClass(index)}></span>
        ))}
      </div>

      {/* Phone-only: names each bar segment, standing in for the
          "Transaction Workflow / Current Stage" header hidden there. */}
      <div className="workflow-labels">
        {steps.map((step, index) => (
          <span key={step} className={stepClass(index)}>
            {step}
          </span>
        ))}
      </div>
    </>
  );
}

export default BuyerTransactions;