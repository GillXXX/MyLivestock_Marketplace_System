import { Fragment, useCallback, useEffect, useState } from "react";

import {
  Search,
  ArrowLeft,
  Download,
  CheckCircle2,
  ChevronRight,
  Clock,
  ClipboardCheck,
  FileCheck2,
  Handshake,
  MessageCircle,
  TrendingUp,
  XCircle,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { exportToCsv } from "../utils/exportCsv";
import useGoBack from "../utils/useGoBack";
import AdminStatCard from "../components/AdminStatCard";
import ProductTypeOptions, { matchesTypeFilter } from "../components/ProductTypeOptions";
import { API_URL } from "../config";
import { formatQuantity } from "../utils/productCatalog";
import "./AdminTransactions.css";

function AdminTransactions() {
  const navigate = useNavigate();
  const goBack = useGoBack("/admin-dashboard");

  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({
    completed: 0,
    pending: 0,
    declinedCancelled: 0,
    tradeValue: 0,
  });

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [livestockFilter, setLivestockFilter] = useState("All Types");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchTransactions = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch(`${API_URL}/api/admin/transactions`, {
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
  }, [navigate]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleExport = () => {
    exportToCsv("transactions.csv", [
      { label: "Transaction", value: (t) => `TRX-${t.id}` },
      { label: "Product", value: (t) => t.livestock_type },
      { label: "Seller", value: (t) => t.seller_name },
      { label: "Buyer", value: (t) => t.buyer_name },
      { label: "Amount", value: (t) => t.amount },
      { label: "Date", value: (t) => new Date(t.created_at).toLocaleDateString() },
      { label: "Workflow Step", value: (t) => t.workflow_step },
      { label: "Status", value: (t) => t.status },
    ], filteredTransactions);
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
      livestockFilter === "All Types" ||
      matchesTypeFilter(trx.livestock_type, livestockFilter);

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
          <button type="button" className="back-btn" onClick={goBack} aria-label="Go back">
            <ArrowLeft size={20} />
          </button>

          <div>
            <span>MAO Transaction Monitoring</span>
            <h1>Transaction Management</h1>
            <p>
              Track livestock and farm product trades from inquiry to completion and monitor
              suspicious or pending transactions.
            </p>
          </div>
        </div>

        <button className="export-btn" type="button" onClick={handleExport}>
          <Download size={18} />
          Export Report
        </button>
      </header>

      <section className="transaction-stats">
        <AdminStatCard
          accent="green"
          icon={<FileCheck2 />}
          value={stats.completed}
          label="Completed"
          note="Completed transactions"
        />

        <AdminStatCard
          accent="amber"
          icon={<Clock />}
          value={stats.pending}
          label="Pending"
          note="Awaiting negotiation/confirmation"
        />

        <AdminStatCard
          accent="purple"
          icon={<XCircle />}
          value={stats.declinedCancelled}
          label="Declined/Cancelled"
          note="Rejected or withdrawn"
        />

        <AdminStatCard
          accent="blue"
          icon={<TrendingUp />}
          value={`₱${Number(stats.tradeValue).toLocaleString()}`}
          label="Trade Value"
          note="Recorded sales"
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
          <option>Declined</option>
          <option>Cancelled</option>
        </select>

        <select
          value={livestockFilter}
          onChange={(e) => setLivestockFilter(e.target.value)}
        >
          <option>All Types</option>
          <ProductTypeOptions />
        </select>
      </section>

      <section className="transactions-card">
        <div className="card-header">
          <div>
            <h3>Transaction Records</h3>
            <p>Monitor complete transaction history and workflow progress.</p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Transaction</th>
                <th>Product</th>
                <th>Parties</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Workflow</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="7">No transaction records found.</td>
                </tr>
              ) : (
                filteredTransactions.map((trx) => (
                  <tr key={trx.id}>
                    <td>
                      <strong className="trx-id">TRX-{trx.id}</strong>
                      <small>Marketplace trade</small>
                    </td>

                    <td>{trx.livestock_type}</td>

                    <td>
                      <div className="party-cell">
                        <span className="party-avatar">{initials(trx.seller_name)}</span>
                        <div>
                          <strong>{trx.seller_name}</strong>
                          <small>Buyer: {trx.buyer_name}</small>
                        </div>
                      </div>
                    </td>

                    <td className="amount">
                      ₱{Number(trx.amount).toLocaleString()}
                      <small className="amount-qty">Qty: {formatQuantity(trx.quantity || 1, trx.unit)}</small>
                    </td>

                    <td>{new Date(trx.created_at).toLocaleDateString()}</td>

                    <td>
                      <Workflow stage={trx.workflow_step} />
                      <small className="stage-label">{trx.workflow_step}</small>
                    </td>

                    <td>
                      <span className={`trx-status ${trx.status.toLowerCase()}`}>
                        <span className="trx-status-dot"></span>
                        {trx.status}
                      </span>
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

function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function Workflow({ stage }) {
  const steps = ["Inquiry", "Negotiation", "Confirmation", "Completed"];
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
