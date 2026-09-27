import { useCallback, useEffect, useState } from "react";

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
  X,
  Mail,
  Phone,
  MapPin,
  UserCircle,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import { exportToCsv } from "../utils/exportCsv";
import AdminStatCard from "../components/AdminStatCard";
import { getDocumentRequirement } from "../utils/livestockDocRequirements";
import { LIVESTOCK_TYPES, getProductIcon } from "../utils/productCatalog";
import { API_URL } from "../config";
import "./AdminVerification.css";

function AdminVerification() {
  const navigate = useNavigate();

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isStaff = currentUser.role === "mao_staff";

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
  const [selectedFarmer, setSelectedFarmer] = useState(null);

  const fetchVerification = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch(`${API_URL}/api/admin/verification`, {
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
  }, [navigate]);

  useEffect(() => {
    fetchVerification();
  }, [fetchVerification]);

  const updateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_URL}/api/admin/verification/${id}/status`,
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

  const getDocumentUrls = (doc) => {
    if (!doc.documents) return [];
    try {
      const parsed = JSON.parse(doc.documents);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  };

  const handleExport = () => {
    exportToCsv("verification-records.csv", [
      { label: "Document ID", value: (d) => `DOC-${d.id}` },
      { label: "Farmer", value: (d) => d.farmer_name },
      { label: "Livestock", value: (d) => d.livestock_type },
      { label: "Document Type", value: (d) => getDocumentType(d.livestock_type, d.category) },
      { label: "Files", value: (d) => getDocumentUrls(d).length },
      { label: "Date Submitted", value: (d) => new Date(d.created_at).toLocaleDateString() },
      {
        label: "Status",
        value: (d) => (d.status === "Available" ? "Approved" : d.status === "Flagged" ? "Rejected" : d.status),
      },
    ], filteredDocuments);
  };

  const filteredDocuments = documents.filter((doc) => {
    const search = searchText.toLowerCase();
    const documentType = getDocumentType(doc.livestock_type, doc.category);

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
              Review barangay health certificates submitted with each
              livestock listing. Farm products may attach optional documents.
            </p>
          </div>
        </div>

        <button className="export-btn" type="button" onClick={handleExport}>
          <Download size={18} />
          Export Records
        </button>
      </header>

      <section className="verification-kpis">
        <AdminStatCard
          icon={<Clock />}
          value={stats.pending}
          label="Pending Review"
          accent="amber"
        />

        <AdminStatCard
          icon={<CheckCircle />}
          value={stats.approved}
          label="Approved Documents"
          accent="green"
        />

        <AdminStatCard
          icon={<AlertTriangle />}
          value={stats.rejected}
          label="Rejected / Flagged"
          accent="red"
        />

        <AdminStatCard
          icon={<ShieldCheck />}
          value={stats.total}
          label="Total Submissions"
          accent="blue"
        />
      </section>

      <section className="verification-panel">
        <div className="panel-header">
          <div>
            <h3>Verification Queue</h3>
            <p>Process submitted livestock documents before transaction confirmation.</p>
          </div>
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
            <option>Barangay health certificate</option>
          <option>{OPTIONAL_DOCUMENT_LABEL}</option>
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
                  const documentType = getDocumentType(doc.livestock_type, doc.category);
                  const docUrls = getDocumentUrls(doc);
                  const requirement = getDocumentRequirement(doc.livestock_type, doc.category);
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
                        <button
                          type="button"
                          className="farmer-cell farmer-cell-link"
                          onClick={() => setSelectedFarmer(doc)}
                        >
                          {doc.farmer_profile_image ? (
                            <img
                              className="avatar"
                              src={getAvatarUrl(doc.farmer_profile_image)}
                              alt={doc.farmer_name}
                            />
                          ) : (
                            <div className="avatar">{doc.farmer_name.charAt(0)}</div>
                          )}

                          <div>
                            <strong>{doc.farmer_name}</strong>
                            <p>Registered Farmer</p>
                          </div>
                        </button>
                      </td>

                      <td>
                        <span className="livestock-pill">{doc.livestock_type}</span>
                      </td>

                      <td>{documentType}</td>

                      <td>
                        <div className="file-cell">
                          <FileText size={18} />
                          <span>
                            {docUrls.length > 0
                              ? docUrls[0].split("/").pop()
                              : "No file uploaded"}
                            {docUrls.length > 1 ? ` (+${docUrls.length - 1} more)` : ""}
                          </span>
                        </div>

                        {requirement && (
                          <span
                            className={`doc-completeness ${
                              docUrls.length >= requirement.minDocuments ? "complete" : "incomplete"
                            }`}
                          >
                            {docUrls.length}/{requirement.minDocuments} required
                          </span>
                        )}
                      </td>

                      <td>{new Date(doc.created_at).toLocaleDateString()}</td>

                      <td>
                        <span className={`doc-status ${displayStatus.toLowerCase()}`}>
                          {displayStatus}
                        </span>
                      </td>

                      <td>
                        <div className="verification-actions">
                          {docUrls.length > 0 && (
                            <>
                              <button
                                className="neutral"
                                title="View Document"
                                type="button"
                                onClick={() => window.open(docUrls[0], "_blank")}
                              >
                                <Eye size={17} />
                              </button>

                              <button
                                className="neutral"
                                title="Download File"
                                type="button"
                                onClick={() => window.open(docUrls[0], "_blank")}
                              >
                                <Download size={17} />
                              </button>
                            </>
                          )}

                          <button
                            className="approve"
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
        <div className="verification-guide-header">
          <div>
            <h3>Livestock Verification Requirements</h3>
            <p>
              Standard documentation MAO expects for each livestock category
              before verification can be approved.
            </p>
          </div>

          <span className="guide-count-pill">
            <ShieldCheck size={14} />
            {VERIFICATION_REQUIREMENTS.length} categories
          </span>
        </div>

        <div className="guide-grid">
          {VERIFICATION_REQUIREMENTS.map((req) => (
            <GuideCard key={req.type} {...req} />
          ))}
        </div>
      </section>

      {selectedFarmer && (
        <div className="doc-modal-overlay" onClick={() => setSelectedFarmer(null)}>
          <div className="doc-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="doc-modal-close"
              type="button"
              onClick={() => setSelectedFarmer(null)}
            >
              <X size={20} />
            </button>

            <div className="doc-modal-head">
              {selectedFarmer.farmer_profile_image ? (
                <img
                  className="doc-modal-avatar-img"
                  src={getAvatarUrl(selectedFarmer.farmer_profile_image)}
                  alt={selectedFarmer.farmer_name}
                />
              ) : (
                <span className="doc-modal-avatar">{initials(selectedFarmer.farmer_name)}</span>
              )}

              <div>
                <h3>{selectedFarmer.farmer_name}</h3>
                <span
                  className={`doc-modal-pill ${
                    selectedFarmer.farmer_is_verified ? "verified" : "pending"
                  }`}
                >
                  {selectedFarmer.farmer_is_verified ? "Verified Farmer" : "Unverified Farmer"}
                </span>
              </div>
            </div>

            <div className="doc-modal-info">
              <div>
                <Mail size={16} />
                <span>{selectedFarmer.farmer_email || "No email on file"}</span>
              </div>
              <div>
                <Phone size={16} />
                <span>{selectedFarmer.farmer_phone || "No phone on file"}</span>
              </div>
              <div>
                <MapPin size={16} />
                <span>
                  {selectedFarmer.farmer_farm_location ||
                    selectedFarmer.farmer_location ||
                    "No location on file"}
                </span>
              </div>
              <div>
                <Clock size={16} />
                <span>
                  Member since{" "}
                  {selectedFarmer.farmer_joined_at
                    ? new Date(selectedFarmer.farmer_joined_at).toLocaleDateString()
                    : "Unknown"}
                </span>
              </div>
            </div>

            <div className="doc-modal-listing">
              <h4>Document under review</h4>
              <div className="doc-modal-listing-row">
                <span className="doc-modal-tag">{selectedFarmer.livestock_type}</span>
                <span
                  className={
                    selectedFarmer.status === "Available"
                      ? "doc-modal-badge approved"
                      : selectedFarmer.status === "Pending"
                      ? "doc-modal-badge pending"
                      : "doc-modal-badge flagged"
                  }
                >
                  <span className="doc-modal-badge-dot"></span>
                  {selectedFarmer.status === "Available"
                    ? "Approved"
                    : selectedFarmer.status === "Flagged"
                    ? "Rejected"
                    : selectedFarmer.status}
                </span>
              </div>
              <p>{getDocumentType(selectedFarmer.livestock_type, selectedFarmer.category)}</p>
            </div>

            {!isStaff && (
              <button
                className="doc-modal-view-all"
                type="button"
                onClick={() => navigate("/admin-users")}
              >
                <UserCircle size={16} /> View Full Profile in User Management
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Only live animals have a required document; farm products don't, so
// they have no guide card.
const GUIDE_PRESENTATION = LIVESTOCK_TYPES.map((type, index) => ({
  type,
  icon: getProductIcon(type),
  accent: index % 2 === 0 ? "amber" : "green",
}));

const OPTIONAL_DOCUMENT_LABEL = "Optional (farm product)";

// Doc lists/logic come from the shared requirement config (also enforced
// server-side at listing submission) so this guide can't drift from what's
// actually required.
const VERIFICATION_REQUIREMENTS = GUIDE_PRESENTATION.map((item) => ({
  ...item,
  ...getDocumentRequirement(item.type),
}));

function getAvatarUrl(image) {
  if (!image) return null;
  return image.startsWith("http") ? image : `${API_URL}${image}`;
}

function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function getDocumentType(type, category) {
  const requirement = getDocumentRequirement(type, category);
  return requirement ? requirement.documents[0] : OPTIONAL_DOCUMENT_LABEL;
}

function GuideCard({ icon: Icon, accent, type, documents, logic }) {
  return (
    <div className={`guide-card accent-${accent}`}>
      <div className="guide-card-top">
        <div className="guide-card-icon">
          <Icon size={20} strokeWidth={2.25} />
        </div>
        <span className="guide-logic-pill">
          {logic === "both"
            ? "Requires both"
            : logic === "single"
            ? "Required"
            : "Requires either"}
        </span>
      </div>

      <strong>{type}</strong>

      <ul className="guide-doc-list">
        {documents.map((doc) => (
          <li key={doc}>
            <FileText size={13} />
            {doc}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AdminVerification;