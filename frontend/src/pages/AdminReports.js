import { useEffect, useState } from "react";

import {
  ArrowLeft,
  BarChart3,
  Users,
  ShoppingBag,
  TrendingUp,
  Printer,
  Calendar,
  FileSpreadsheet,
  PieChart,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  ShieldCheck,
  Receipt,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { exportSectionsToCsv } from "../utils/exportCsv";
import useGoBack from "../utils/useGoBack";
import AdminStatCard from "../components/AdminStatCard";
import ProductTypeOptions from "../components/ProductTypeOptions";
import { API_URL } from "../config";
import { getProductIcon } from "../utils/productCatalog";
import "./AdminReports.css";

function AdminReports() {
  const navigate = useNavigate();
  const goBack = useGoBack("/admin-dashboard");

  const [metrics, setMetrics] = useState({
    totalFarmers: 0,
    totalBuyers: 0,
    livestockSold: 0,
    tradeValue: 0,
  });

  const [deltas, setDeltas] = useState({});
  const [livestockData, setLivestockData] = useState([]);
  const [verification, setVerification] = useState({
    approved: 0,
    pending: 0,
    rejected: 0,
  });

  const [monthlyTransactions, setMonthlyTransactions] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [period, setPeriod] = useState("current");
  const [livestockFilter, setLivestockFilter] = useState("All Livestock");

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const params = new URLSearchParams({
          period,
          livestockType: livestockFilter,
        });

        const res = await fetch(
          `${API_URL}/api/admin/reports?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await res.json();

        if (!res.ok) {
          setMessage(data.message || "Failed to load reports");
          setLoading(false);
          return;
        }

        setMetrics(data.metrics);
        setDeltas(data.deltas || {});
        setLivestockData(data.livestockData);
        setVerification(data.verification);
        setMonthlyTransactions(data.monthlyTransactions);
        setMonthlyTrend(data.monthlyTrend || []);
        setGeneratedAt(data.generatedAt ? new Date(data.generatedAt) : new Date());
        setLoading(false);
      } catch (error) {
        setMessage("Cannot connect to backend server");
        setLoading(false);
      }
    };

    fetchReports();
  }, [navigate, period, livestockFilter]);

  const periodLabel =
    period === "current" ? "Current Month" : period === "previous" ? "Previous Month" : "This Year";

  const deltaPct = (row) => (row.delta && row.delta.pct != null ? `${row.delta.pct}%` : "—");

  const handleExport = () => {
    exportSectionsToCsv("admin-report.csv", [
      {
        title: `Report Summary (${periodLabel}, ${
          livestockFilter === "All Livestock" ? "All Types" : livestockFilter
        })`,
        columns: [
          { label: "Metric", value: (r) => r.metric },
          { label: "Value", value: (r) => r.value },
        ],
        rows: [
          { metric: "New Farmers", value: metrics.totalFarmers },
          { metric: "New Buyers", value: metrics.totalBuyers },
          { metric: "Items Sold", value: metrics.livestockSold },
          { metric: "Trade Value", value: `₱${Number(metrics.tradeValue).toLocaleString()}` },
        ],
      },
      {
        title: "Product Performance",
        columns: [
          { label: "Product Type", value: (l) => l.type },
          { label: "Records", value: (l) => l.total },
          { label: "Percent", value: (l) => l.percent },
          { label: "Value", value: (l) => l.value },
          { label: "Trend vs Prior Period", value: deltaPct },
        ],
        rows: livestockData,
      },
      {
        title: "Verification Summary",
        columns: [
          { label: "Status", value: (r) => r.status },
          { label: "Count", value: (r) => r.count },
        ],
        rows: [
          { status: "Approved", count: verification.approved },
          { status: "Pending", count: verification.pending },
          { status: "Rejected / Flagged", count: verification.rejected },
        ],
      },
      {
        title: "Monthly Transaction Report",
        columns: [
          { label: "Product", value: (r) => r.livestock_type },
          { label: "Completed", value: (r) => r.completed },
          { label: "Pending", value: (r) => r.pending },
          { label: "Total Value", value: (r) => r.totalValue },
          { label: "Trend vs Prior Period", value: deltaPct },
        ],
        rows: monthlyTransactions,
      },
      {
        title: "Trade Value Trend (Last 6 Months)",
        columns: [
          { label: "Month", value: (r) => r.month },
          { label: "Trade Value", value: (r) => r.tradeValue },
          { label: "Completed Transactions", value: (r) => r.completed },
        ],
        rows: monthlyTrend,
      },
    ]);
  };

  if (loading) {
    return <h2 style={{ padding: "30px" }}>Loading reports...</h2>;
  }

  if (message) {
    return <h2 style={{ padding: "30px", color: "red" }}>{message}</h2>;
  }

  const transactionTotals = monthlyTransactions.reduce(
    (acc, item) => ({
      completed: acc.completed + Number(item.completed),
      pending: acc.pending + Number(item.pending),
      totalValue: acc.totalValue + Number(item.totalValue),
    }),
    { completed: 0, pending: 0, totalValue: 0 }
  );

  return (
    <div className="reports-page">
      <header className="reports-hero">
        <button type="button" className="back-btn" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>

        <div>
          <span className="eyebrow">MAO Monitoring and Analytics</span>
          <h1>Reports & Analytics</h1>
          <p>
            Generate official summaries for livestock and farm product trading,
            users, verifications, and recorded transactions in Veruela.
          </p>
        </div>
      </header>

      <section className="report-actions">
        <div className="filter-box">
          <Calendar size={18} />
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="current">Current Month</option>
            <option value="previous">Previous Month</option>
            <option value="year">This Year</option>
          </select>
        </div>

        <div className="filter-box">
          <Filter size={18} />
          <select
            value={livestockFilter}
            onChange={(e) => setLivestockFilter(e.target.value)}
          >
            {/* "All Livestock" is the value the reports API treats as
                "no type filter"; it's shown as "All Types". */}
            <option value="All Livestock">All Types</option>
            <ProductTypeOptions includeOther={false} />
          </select>
        </div>

        {generatedAt && (
          <span className="generated-at">
            <Clock size={13} />
            Generated {generatedAt.toLocaleDateString()} at{" "}
            {generatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}

        <button className="secondary-action" type="button" onClick={handleExport}>
          <FileSpreadsheet size={18} />
          Export CSV
        </button>

        <button className="print-action" type="button" onClick={() => window.print()}>
          <Printer size={18} />
          Print
        </button>
      </section>

      <section className="analytics-grid">
        <AdminStatCard
          accent="green"
          icon={<Users />}
          label="New Farmers"
          value={metrics.totalFarmers}
          note="Registered this period"
          delta={deltas.totalFarmers}
        />

        <AdminStatCard
          accent="blue"
          icon={<ShoppingBag />}
          label="New Buyers"
          value={metrics.totalBuyers}
          note="Registered this period"
          delta={deltas.totalBuyers}
        />

        <AdminStatCard
          accent="amber"
          icon={<BarChart3 />}
          label="Items Sold"
          value={metrics.livestockSold}
          note="Completed transactions"
          delta={deltas.livestockSold}
        />

        <AdminStatCard
          accent="purple"
          icon={<TrendingUp />}
          label="Trade Value"
          value={`₱${Number(metrics.tradeValue).toLocaleString()}`}
          note="Recorded completed sales"
          delta={deltas.tradeValue}
        />
      </section>

      <section className="reports-layout single">
        <div className="report-card large">
          <div className="card-title">
            <div>
              <h3>Product Performance</h3>
              <p>Breakdown of listings and transactions by livestock and farm product type.</p>
            </div>

            <span className="card-icon-badge">
              <PieChart size={20} />
            </span>
          </div>

          <div className="perf-grid">
            {livestockData.length === 0 ? (
              <p>No listing data available.</p>
            ) : (
              livestockData.map((item) => {
                const AnimalIcon = getProductIcon(item.type, item.category);

                return (
                <div className={`perf-card ${item.type.toLowerCase()}`} key={item.type}>
                  <div className="livestock-card-top">
                    <div className={`performance-icon ${item.type.toLowerCase()}`}>
                      <AnimalIcon size={20} strokeWidth={2.25} />
                    </div>
                    <DeltaBadge delta={item.delta} />
                  </div>

                  <strong className="livestock-card-title">{item.type}</strong>

                  <div className="livestock-card-figures">
                    <span className="livestock-card-total">{item.total}</span>
                    <span className="livestock-card-unit">records</span>
                  </div>

                  <p className="livestock-card-value">
                    ₱{Number(item.value).toLocaleString()} total value
                  </p>

                  <div className="progress-area">
                    <span>{item.percent} of listings</span>
                    <div className="progress-bar">
                      <div className={item.type.toLowerCase()} style={{ width: item.percent }}></div>
                    </div>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      <section className="reports-layout single">
        <div className="report-card large">
          <div className="card-title">
            <div>
              <h3>Trade Value Trend</h3>
              <p>Completed trade value for the last 6 months.</p>
            </div>

            <span className="card-icon-badge">
              <Activity size={20} />
            </span>
          </div>

          <TradeTrendChart data={monthlyTrend} />
        </div>
      </section>

      <section className="reports-layout bottom">
        <div className="report-card">
          <div className="card-title">
            <div>
              <h3>Verification Summary</h3>
              <p>Status of submitted listing documents.</p>
            </div>

            <span className="card-icon-badge">
              <ShieldCheck size={20} />
            </span>
          </div>

          <VerificationDonut verification={verification} />
        </div>

        <div className="report-card large">
          <div className="card-title">
            <div>
              <h3>Monthly Transaction Report</h3>
              <p>Official transaction summary for selected period.</p>
            </div>

            <span className="card-icon-badge">
              <Receipt size={20} />
            </span>
          </div>

          <div className="table-responsive">
            <table className="professional-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Completed</th>
                  <th>Pending</th>
                  <th>Outcome Split</th>
                  <th>Total Value</th>
                  <th>Trend</th>
                </tr>
              </thead>

              <tbody>
                {monthlyTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="6">No transaction data available.</td>
                  </tr>
                ) : (
                  monthlyTransactions.map((item) => {
                    const AnimalIcon = getProductIcon(item.livestock_type, item.category);

                    return (
                    <tr key={item.livestock_type}>
                      <td>
                        <div className="table-livestock-cell">
                          <span className={`table-livestock-icon ${item.livestock_type.toLowerCase()}`}>
                            <AnimalIcon size={16} strokeWidth={2.25} />
                          </span>
                          {item.livestock_type}
                        </div>
                      </td>
                      <td>{item.completed}</td>
                      <td>{item.pending}</td>
                      <td>
                        <OutcomeBar completed={item.completed} pending={item.pending} />
                      </td>
                      <td className="value-cell">₱{Number(item.totalValue).toLocaleString()}</td>
                      <td>
                        <DeltaBadge delta={item.delta} />
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>

              {monthlyTransactions.length > 0 && (
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td>{transactionTotals.completed}</td>
                    <td>{transactionTotals.pending}</td>
                    <td>
                      <OutcomeBar
                        completed={transactionTotals.completed}
                        pending={transactionTotals.pending}
                      />
                    </td>
                    <td className="value-cell">
                      ₱{Number(transactionTotals.totalValue).toLocaleString()}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function DeltaBadge({ delta }) {
  if (!delta) return null;
  const { pct, current, previous } = delta;

  if (pct === null) {
    return current > 0 ? (
      <span className="kpi-delta up">
        <ArrowUpRight size={12} /> New
      </span>
    ) : null;
  }

  if (pct === 0 && current === 0 && previous === 0) return null;

  const isUp = pct >= 0;

  return (
    <span className={`kpi-delta ${isUp ? "up" : "down"}`}>
      {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(pct)}%
    </span>
  );
}

// Compact stacked bar showing the completed/pending split for a row at a
// glance — the exact counts stay in their own columns, this is purely the
// proportional read.
function OutcomeBar({ completed, pending }) {
  const total = Number(completed) + Number(pending);

  if (total === 0) {
    return <div className="outcome-bar outcome-bar-empty" title="No transactions yet" />;
  }

  return (
    <div
      className="outcome-bar"
      title={`${completed} completed • ${pending} pending`}
    >
      {completed > 0 && (
        <span className="outcome-segment completed" style={{ width: `${(completed / total) * 100}%` }} />
      )}
      {pending > 0 && (
        <span className="outcome-segment pending" style={{ width: `${(pending / total) * 100}%` }} />
      )}
    </div>
  );
}

function formatCompactCurrency(value) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `₱${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `₱${(value / 1_000).toFixed(1)}K`;
  return `₱${value}`;
}

// Rounds up to a "clean" axis ceiling (1/2/5 × a power of ten) so the
// gridlines land on numbers a reader would round to themselves.
function niceCeiling(value) {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const residual = value / magnitude;
  let niceResidual = 10;
  if (residual <= 1) niceResidual = 1;
  else if (residual <= 2) niceResidual = 2;
  else if (residual <= 5) niceResidual = 5;
  return niceResidual * magnitude;
}

// Single-series line chart (trade value per month) — no legend needed since
// there's only one series (the card title already names it). Only the
// endpoint carries a direct value label (never one per point); the
// hover/focus crosshair + tooltip fill in the rest, and the sr-only table
// keeps the data reachable without the chart at all.
function TradeTrendChart({ data }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!data || data.length === 0) {
    return <p className="trend-empty">No trend data available yet.</p>;
  }

  const hasActivity = data.some((item) => item.tradeValue > 0);

  if (!hasActivity) {
    return (
      <p className="trend-empty">
        No completed trades recorded in the last 6 months yet.
      </p>
    );
  }

  const width = 640;
  const height = 170;
  const padding = { top: 20, right: 20, bottom: 30, left: 20 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const niceMax = niceCeiling(Math.max(...data.map((d) => d.tradeValue), 1));
  const stepX = data.length > 1 ? plotWidth / (data.length - 1) : 0;

  const points = data.map((item, index) => ({
    ...item,
    x: padding.left + index * stepX,
    y: padding.top + plotHeight - (item.tradeValue / niceMax) * plotHeight,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${padding.top + plotHeight} L ${points[0].x.toFixed(1)} ${padding.top + plotHeight} Z`;

  const lastPoint = points[points.length - 1];
  const hovered = hoverIndex != null ? points[hoverIndex] : null;

  const previousPoint = points.length > 1 ? points[points.length - 2] : null;
  const heroPct = !previousPoint
    ? null
    : previousPoint.tradeValue === 0
    ? lastPoint.tradeValue === 0
      ? 0
      : null
    : Math.round(
        ((lastPoint.tradeValue - previousPoint.tradeValue) / previousPoint.tradeValue) * 100
      );
  const heroDelta = previousPoint
    ? { current: lastPoint.tradeValue, previous: previousPoint.tradeValue, pct: heroPct }
    : null;

  const tooltipWidth = 108;
  const tooltipHeight = 44;
  const tooltipX = hovered
    ? Math.min(Math.max(hovered.x - tooltipWidth / 2, 2), width - tooltipWidth - 2)
    : 0;
  const tooltipY = hovered ? Math.max(hovered.y - tooltipHeight - 14, 2) : 0;

  return (
    <div className="trend-chart">
      <div className="trend-hero">
        <div>
          <span className="trend-hero-label">{lastPoint.month} trade value</span>
          <div className="trend-hero-figures">
            <span className="trend-hero-value">₱{lastPoint.tradeValue.toLocaleString()}</span>
            <DeltaBadge delta={heroDelta} />
          </div>
        </div>
        <span className="trend-hero-note">{lastPoint.completed} completed this month</span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="trend-chart-svg"
        role="img"
        aria-label="Trade value trend for the last 6 months"
      >
        <defs>
          <linearGradient id="trend-area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((fraction) => {
          const y = padding.top + plotHeight * (1 - fraction);
          return (
            <line
              key={fraction}
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              className="trend-gridline"
            />
          );
        })}

        {hovered && (
          <line
            x1={hovered.x}
            x2={hovered.x}
            y1={padding.top}
            y2={padding.top + plotHeight}
            className="trend-crosshair"
          />
        )}

        <path d={areaPath} fill="url(#trend-area-fill)" stroke="none" />
        <path d={linePath} className="trend-line" fill="none" />

        <text
          x={lastPoint.x}
          y={lastPoint.y - 14}
          textAnchor="end"
          className="trend-end-value"
        >
          {formatCompactCurrency(lastPoint.tradeValue)}
        </text>

        {points.map((point, index) => (
          <g
            key={point.month}
            className="trend-point-group"
            tabIndex={0}
            onMouseEnter={() => setHoverIndex(index)}
            onMouseLeave={() => setHoverIndex(null)}
            onFocus={() => setHoverIndex(index)}
            onBlur={() => setHoverIndex(null)}
          >
            <rect
              x={point.x - stepX / 2}
              y={padding.top}
              width={stepX || plotWidth}
              height={plotHeight}
              fill="transparent"
            />

            <circle
              cx={point.x}
              cy={point.y}
              r={hoverIndex === index ? 6 : 4}
              className={`trend-dot ${hoverIndex === index ? "hovered" : ""}`}
            />

            <text x={point.x} y={height - 8} textAnchor="middle" className="trend-bar-label">
              {point.month}
            </text>
          </g>
        ))}

        {hovered && (
          <g transform={`translate(${tooltipX}, ${tooltipY})`}>
            <rect width={tooltipWidth} height={tooltipHeight} rx={8} className="trend-tooltip-bg" />
            <text x={12} y={18} className="trend-tooltip-value">
              ₱{hovered.tradeValue.toLocaleString()}
            </text>
            <text x={12} y={34} className="trend-tooltip-month">
              {hovered.month} • {hovered.completed} completed
            </text>
          </g>
        )}
      </svg>

      <table className="sr-only-table">
        <caption>Trade value by month, last 6 months</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>Trade value</th>
            <th>Completed transactions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.month}>
              <td>{item.month}</td>
              <td>₱{item.tradeValue.toLocaleString()}</td>
              <td>{item.completed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const VERIFICATION_SEGMENTS = [
  { key: "approved", label: "Approved", icon: CheckCircle, type: "success", color: "#16a34a" },
  { key: "pending", label: "Pending Review", icon: Clock, type: "warning", color: "#d7a24d" },
  { key: "rejected", label: "Rejected / Flagged", icon: AlertTriangle, type: "danger", color: "#dc2626" },
];

// Donut + legend pairing (proportion at a glance, exact counts alongside) —
// a clearer read than three stacked count tiles for a 3-way status split.
function VerificationDonut({ verification }) {
  const [hoverKey, setHoverKey] = useState(null);

  const segments = VERIFICATION_SEGMENTS.map((seg) => ({
    ...seg,
    value: Number(verification[seg.key]) || 0,
  }));

  const total = segments.reduce((sum, seg) => sum + seg.value, 0);
  const size = 156;
  const thickness = 22;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const hovered = segments.find((seg) => seg.key === hoverKey) || null;
  let offset = 0;

  return (
    <div className="verif-donut-wrap">
      <svg viewBox={`0 0 ${size} ${size}`} className="verif-donut">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(15, 61, 46, 0.08)" strokeWidth={thickness} />
          {total > 0 &&
            segments.map((seg) => {
              if (seg.value === 0) return null;
              const fraction = seg.value / total;
              const dash = fraction * circumference;
              const isHovered = hoverKey === seg.key;
              const circle = (
                <circle
                  key={seg.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={isHovered ? thickness + 4 : thickness}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="round"
                  opacity={hoverKey && !isHovered ? 0.4 : 1}
                  className="verif-donut-segment"
                  onMouseEnter={() => setHoverKey(seg.key)}
                  onMouseLeave={() => setHoverKey(null)}
                />
              );
              offset += dash;
              return circle;
            })}
        </g>

        <text x="50%" y="46%" textAnchor="middle" className="verif-donut-total">
          {hovered ? hovered.value : total}
        </text>
        <text x="50%" y="64%" textAnchor="middle" className="verif-donut-label">
          {hovered ? hovered.label : "documents"}
        </text>
      </svg>

      <ul className="verif-legend">
        {segments.map((seg) => {
          const Icon = seg.icon;
          return (
            <li
              key={seg.key}
              className={`verif-legend-row ${seg.type} ${hoverKey === seg.key ? "active" : ""}`}
              onMouseEnter={() => setHoverKey(seg.key)}
              onMouseLeave={() => setHoverKey(null)}
            >
              <span className="verif-legend-icon">
                <Icon size={16} />
              </span>
              <span className="verif-legend-text">
                <strong>{seg.label}</strong>
                <small>{total > 0 ? Math.round((seg.value / total) * 100) : 0}% of documents</small>
              </span>
              <span className="verif-legend-value">{seg.value}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default AdminReports;