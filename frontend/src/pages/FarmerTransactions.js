import { Fragment, useEffect, useState } from "react";

import {
  ArrowLeft,
  Search,
  FileCheck2,
  Clock,
  CheckCircle,
  CheckCircle2,
  MessageCircle,
  MapPin,
  ShieldCheck,
  Calendar,
  Wallet,
  XCircle,
  PackageSearch,
  Handshake,
  ClipboardCheck,
  ChevronRight,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import AdminStatCard from "../components/AdminStatCard";
import ProductTypeOptions, { matchesTypeFilter } from "../components/ProductTypeOptions";
import { API_URL } from "../config";
import { getProductIcon, formatQuantity } from "../utils/productCatalog";
import useGoBack from "../utils/useGoBack";
import "./FarmerTransactions.css";

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

function FarmerTransactions() {
  const navigate = useNavigate();
  const goBack = useGoBack("/farmer-dashboard");

  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    pendingDeals: 0,
    completed: 0,
    declined: 0,
    tradeValue: 0,
  });

  const [actioningId, setActioningId] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [typeFilter, setTypeFilter] = useState("All Types");
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

  const WORKFLOW_STEPS = ["Inquiry", "Negotiation", "Confirmation", "Completed"];

  const advanceStep = async (id) => {
    setActioningId(id);

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
        setActioningId(null);
        return;
      }

      await fetchTransactions();
    } catch (error) {
      alert("Cannot connect to backend server");
    }

    setActioningId(null);
  };

  const declineOffer = async (id) => {
    if (!window.confirm("Decline this offer? This cannot be undone.")) {
      return;
    }

    setActioningId(id);

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
        setActioningId(null);
        return;
      }

      await fetchTransactions();
    } catch (error) {
      alert("Cannot connect to backend server");
    }

    setActioningId(null);
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

    if (typeFilter !== "All Types") {
      results = results.filter((item) => matchesTypeFilter(item.livestock_type, typeFilter));
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
          <button type="button" className="back-btn" onClick={goBack} aria-label="Go back">
            <ArrowLeft size={20} />
          </button>

          <div>
            <span className="page-tag">FARMER TRANSACTION CENTER</span>
            <h1>My Sales</h1>
            <p>
              Track buyer inquiries, negotiations, verification progress,
              and completed sales.
            </p>
          </div>
        </div>
      </header>

      <section className="transaction-stats">
        <AdminStatCard
          icon={<FileCheck2 />}
          value={stats.totalTransactions}
          label="Total Transactions"
          note="All sale records"
        />

        <AdminStatCard
          icon={<Clock />}
          value={stats.pendingDeals}
          label="Pending Deals"
          note="Awaiting next step"
        />

        <AdminStatCard
          icon={<CheckCircle />}
          value={stats.completed}
          label="Completed"
          note="Recorded sales"
        />

        <AdminStatCard
          icon={<Wallet />}
          value={`₱${Number(stats.tradeValue).toLocaleString()}`}
          label="Trade Value"
          note="Total completed value"
        />
      </section>

      <section className="workflow-overview">
        <div>
          <h3>Structured Trading Workflow</h3>
          <p>Every transaction must pass these required stages.</p>
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
            placeholder="Search transaction, buyer, product..."
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
          <option>All Types</option>
          <ProductTypeOptions />
        </select>
      </section>

      <section className="transactions-card">
        <div className="card-header">
          <div>
            <h3>Sales Transaction Records</h3>
            <p>Monitor every deal through the structured workflow.</p>
          </div>
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
                <PackageSearch size={38} />
                <h3>No transactions found</h3>
                <p>
                  {transactions.length === 0
                    ? "Buyer offers on your listings will show up here."
                    : "Try a different keyword or clear your filters."}
                </p>
              </div>
            ) : (
              filteredTransactions.map((item) => {
                const isTerminal = item.status === "Declined" || item.status === "Cancelled";
                const SpeciesIcon = getProductIcon(item.livestock_type, item.category);
                const isActioning = actioningId === item.id;

                return (
                <div className="premium-transaction-card" key={item.id}>
                  <div className="transaction-top">
                    <div className="transaction-left">
                      {item.image_url ? (
                        <img className="transaction-thumb" src={item.image_url} alt={item.breed} />
                      ) : (
                        <div className="transaction-icon-box">
                          <SpeciesIcon size={22} />
                        </div>
                      )}

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

                        <p className="buyer-track-record">
                          {Number(item.buyer_total_deals) > 1 ? (
                            <>
                              {item.buyer_completed_deals} completed
                              {Number(item.buyer_fallthrough_deals) > 0 &&
                                ` · ${item.buyer_fallthrough_deals} fell through`}
                            </>
                          ) : (
                            "New buyer · no prior deal history"
                          )}
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
                      <span className="transaction-qty">
                        Qty: {formatQuantity(item.quantity || 1, item.unit)}
                      </span>

                      <span
                        className={
                          item.status === "Completed"
                            ? "premium-status completed"
                            : isTerminal
                            ? "premium-status declined"
                            : "premium-status pending"
                        }
                      >
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
                        <strong>MAO Monitored Transaction</strong>
                        <p>
                          You and the buyer control negotiation and confirmation.
                          MAO can view this transaction and steps taken here for
                          oversight, but won't block it from progressing.
                        </p>
                      </div>
                    </div>

                    <div className="premium-actions">
                      <Link
                        className="message-btn-premium"
                        to="/farmer-messages"
                        state={item.conversation_id ? { conversationId: item.conversation_id } : undefined}
                      >
                        <MessageCircle size={17} />
                        Message Buyer
                      </Link>

                      {item.status === "Pending" &&
                        item.workflow_step !== "Confirmation" &&
                        (() => {
                          const nextStep =
                            WORKFLOW_STEPS[WORKFLOW_STEPS.indexOf(item.workflow_step) + 1];

                          return (
                            <button
                              type="button"
                              className="message-btn-premium"
                              disabled={isActioning}
                              onClick={() => advanceStep(item.id)}
                            >
                              <CheckCircle size={17} />
                              {isActioning ? "Advancing..." : `Advance to ${nextStep}`}
                            </button>
                          );
                        })()}

                      {item.status === "Pending" && item.workflow_step === "Confirmation" && (
                        <span className="waiting-buyer-note">Waiting for buyer to confirm</span>
                      )}

                      {item.status === "Pending" && (
                        <button
                          type="button"
                          className="decline-btn-premium"
                          disabled={isActioning}
                          onClick={() => declineOffer(item.id)}
                        >
                          <XCircle size={17} />
                          {isActioning ? "Declining..." : "Decline Offer"}
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


export default FarmerTransactions;
