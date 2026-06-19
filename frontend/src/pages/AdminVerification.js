import { useEffect, useState } from "react";

import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  FileText,
  ArrowLeft,
  Download,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Filter,
  MoreHorizontal,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import "./AdminVerification.css";

function AdminVerification() {
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });

  const [searchText, setSearchText] = useState("");
  const [documentFilter, setDocumentFilter] = useState("All Document Types");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchVerification = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch("http://localhost:5000/api/admin/verification", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Failed to load verification records");
        setLoading(false);
        return;
      }

      setDocuments(data.documents);
      setStats(data.stats);
      setLoading(false);
    } catch (error) {
      setMessage("Cannot connect to backend server");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerification();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `http://localhost:5000/api/admin/verification/${id}/status`,
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
        alert(data.message || "Failed to update verification status");
        return;
      }

      fetchVerification();
    } catch (error) {
      alert("Cannot connect to backend server");
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const search = searchText.toLowerCase();
    const documentType = getDocumentType(doc.livestock_type);

    const displayStatus =
      doc.status === "Available"
        ? "Approved"
        : doc.status === "Flagged"
        ? "Rejected"
        : doc.status;

    const matchesSearch =
      doc.farmer_name?.toLowerCase().includes(search) ||
      doc.livestock_type?.toLowerCase().includes(search) ||
      documentType.toLowerCase().includes(search) ||
      String(doc.id).includes(search);

    const matchesDocument =
      documentFilter === "All Document Types" || documentType === documentFilter;

    const matchesStatus =
      statusFilter === "All Status" || displayStatus === statusFilter;

    return matchesSearch && matchesDocument && matchesStatus;
  });

  if (loading) {
    return <h2 style={{ padding: "30px" }}>Loading verification records...</h2>;
  }

  if (message) {
    return <h2 style={{ padding: "30px", color: "red" }}>{message}</h2>;
  }

  return (
    <div className="verification-page">
      <header className="verification-topbar">
        <div className="top-left">
          <Link to="/admin-dashboard" className="back-btn">
            <ArrowLeft size={20} />
          </Link>

          <div>
            <span>MAO Document Control</span>
            <h1>Document Verification</h1>
            <p>
              Review livestock health certificates, BAI permits, vaccination
              records, and MAO clearance files.
            </p>
          </div>
        </div>

        <button className="export-btn" type="button">
          <Download size={18} />
          Export Records
        </button>
      </header>

      <section className="verification-kpis">
        <KpiCard
          icon={<Clock />}
          value={stats.pending}
          label="Pending Review"
          tone="warning"
        />

        <KpiCard
          icon={<CheckCircle />}
          value={stats.approved}
          label="Approved Documents"
          tone="success"
        />

        <KpiCard
          icon={<AlertTriangle />}
          value={stats.rejected}
          label="Rejected / Flagged"
          tone="danger"
        />

        <KpiCard
          icon={<ShieldCheck />}
          value={stats.total}
          label="Total Submissions"
          tone="primary"
        />
      </section>

      <section className="verification-panel">
        <div className="panel-header">
          <div>
            <h3>Verification Queue</h3>
            <p>Process submitted livestock documents before transaction confirmation.</p>
          </div>

          <button className="more-btn" type="button">
            <MoreHorizontal size={22} />
          </button>
        </div>

        <div className="verification-toolbar">
          <div className="verification-search">
            <Search size={18} />

            <input
              placeholder="Search farmer, livestock, document, or file name..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <select
            value={documentFilter}
            onChange={(e) => setDocumentFilter(e.target.value)}
          >
            <option>All Document Types</option>
            <option>Health Certificate</option>
            <option>BAI Transport Permit</option>
            <option>Vaccination Record</option>
            <option>MAO Clearance</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>All Status</option>
            <option>Pending</option>
            <option>Approved</option>
            <option>Rejected</option>
          </select>

          <button className="filter-btn" type="button">
            <Filter size={17} />
            Filter
          </button>
        </div>

        <div className="table-responsive">
          <table className="verification-table">
            <thead>
              <tr>
                <th>Document ID</th>
                <th>Farmer</th>
                <th>Livestock</th>
                <th>Document Type</th>
                <th>File</th>
                <th>Date Submitted</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan="8">No verification records found.</td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => {
                  const documentType = getDocumentType(doc.livestock_type);
                  const displayStatus =
                    doc.status === "Available"
                      ? "Approved"
                      : doc.status === "Flagged"
                      ? "Rejected"
                      : doc.status;

                  return (
                    <tr key={doc.id}>
                      <td>
                        <strong>DOC-{doc.id}</strong>
                      </td>

                      <td>
                        <div className="farmer-cell">
                          <div className="avatar">{doc.farmer_name.charAt(0)}</div>

                          <div>
                            <strong>{doc.farmer_name}</strong>
                            <p>Registered Farmer</p>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="livestock-pill">{doc.livestock_type}</span>
                      </td>

                      <td>{documentType}</td>

                      <td>
                        <div className="file-cell">
                          <FileText size={18} />
                          <span>
                            {doc.livestock_type.toLowerCase()}-document.pdf
                          </span>
                        </div>
                      </td>

                      <td>{new Date(doc.created_at).toLocaleDateString()}</td>

                      <td>
                        <span className={`doc-status ${displayStatus.toLowerCase()}`}>
                          {displayStatus}
                        </span>
                      </td>

                      <td>
                        <div className="verification-actions">
                          <button title="View Document" type="button">
                            <Eye size={17} />
                          </button>

                          <button title="Download File" type="button">
                            <Download size={17} />
                          </button>

                          <button
                            title="Approve Document"
                            type="button"
                            onClick={() => updateStatus(doc.id, "Available")}
                          >
                            <CheckCircle size={17} />
                          </button>

                          <button
                            className="danger"
                            title="Reject Document"
                            type="button"
                            onClick={() => updateStatus(doc.id, "Rejected")}
                          >
                            <XCircle size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="verification-guide">
        <div>
          <h3>Livestock Verification Requirements</h3>
          <p>
            These requirements help standardize the verification stage of the
            livestock trading workflow.
          </p>
        </div>

        <div className="guide-grid">
          <GuideCard title="Swine" text="Veterinary certificate or MAO health clearance." />
          <GuideCard title="Cattle" text="Health certificate and BAI livestock transport permit." />
          <GuideCard title="Goat" text="Vaccination record and MAO clearance." />
          <GuideCard title="Poultry" text="Flock health declaration or health clearance." />
        </div>
      </section>
    </div>
  );
}

function getDocumentType(type) {
  if (type === "Swine") return "Health Certificate";
  if (type === "Cattle") return "BAI Transport Permit";
  if (type === "Goat") return "Vaccination Record";
  if (type === "Poultry") return "MAO Clearance";
  return "Health Certificate";
}

function KpiCard({ icon, value, label, tone }) {
  return (
    <div className={`verify-kpi ${tone}`}>
      <div className="kpi-icon">{icon}</div>

      <div>
        <h2>{value}</h2>
        <p>{label}</p>
      </div>
    </div>
  );
}

function GuideCard({ title, text }) {
  return (
    <div className="guide-card">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

export default AdminVerification;