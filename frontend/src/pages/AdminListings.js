import { useCallback, useEffect, useState } from "react";

import {
  Search,
  CheckCircle,
  AlertTriangle,
  Flag,
  Trash2,
  ArrowLeft,
  MapPin,
  ClipboardCheck,
  Clock,
  BadgeCheck,
  XCircle,
} from "lucide-react";

import { Link, useNavigate, useLocation } from "react-router-dom";
import { exportToCsv } from "../utils/exportCsv";
import AdminStatCard from "../components/AdminStatCard";
import ProductTypeOptions, { matchesTypeFilter } from "../components/ProductTypeOptions";
import { API_URL } from "../config";
import { ALL_KNOWN_TYPES, getCategory, formatPrice } from "../utils/productCatalog";
import "./AdminListings.css";

function AdminListings() {
  const navigate = useNavigate();
  const location = useLocation();

  const [listings, setListings] = useState([]);
  const [stats, setStats] = useState({
    totalListings: 0,
    pendingReview: 0,
    approved: 0,
    flagged: 0,
  });

  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState(location.state?.typeFilter || "All Types");
  const [statusFilter, setStatusFilter] = useState(location.state?.statusFilter || "All Status");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  const fetchListings = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch(`${API_URL}/api/admin/listings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Failed to load listings");
        setLoading(false);
        return;
      }

      setListings(data.listings);
      setStats(data.stats);
      setLoading(false);
    } catch (error) {
      setMessage("Cannot connect to backend server");
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const updateStatus = async (id, status, reason) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/admin/listings/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, reason }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to update listing");
        return;
      }

      fetchListings();
    } catch (error) {
      alert("Cannot connect to backend server");
    }
  };

  const handleFlag = (item) => {
    const reason = window.prompt(
      `Reason for flagging this ${item.livestock_type} listing? (optional)`,
      item.review_note || ""
    );
    if (reason === null) return;
    updateStatus(item.id, "Flagged", reason);
  };

  const handleReject = (item) => {
    const reason = window.prompt(
      `Reason for rejecting this ${item.livestock_type} listing? (optional)`,
      item.review_note || ""
    );
    if (reason === null) return;
    updateStatus(item.id, "Rejected", reason);
  };

  const deleteListing = async (id) => {
    const confirmDelete = window.confirm("Delete this listing?");
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/admin/listings/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to delete listing");
        return;
      }

      fetchListings();
    } catch (error) {
      alert("Cannot connect to backend server");
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const visibleIds = filteredListings.map((item) => item.id);
    const allSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

    setSelectedIds(allSelected ? [] : visibleIds);
  };

  const bulkUpdateStatus = async (status, reason) => {
    if (selectedIds.length === 0) return;

    try {
      const token = localStorage.getItem("token");

      await Promise.all(
        selectedIds.map((id) =>
          fetch(`${API_URL}/api/admin/listings/${id}/status`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status, reason }),
          })
        )
      );

      setSelectedIds([]);
      fetchListings();
    } catch (error) {
      alert("Cannot connect to backend server");
    }
  };

  const handleBulkApprove = () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Approve ${selectedIds.length} selected listing(s)?`)) return;
    bulkUpdateStatus("Available");
  };

  const handleBulkFlag = () => {
    if (selectedIds.length === 0) return;
    const reason = window.prompt(
      `Reason for flagging ${selectedIds.length} selected listing(s)? (optional)`
    );
    if (reason === null) return;
    bulkUpdateStatus("Flagged", reason);
  };

  const handleBulkReject = () => {
    if (selectedIds.length === 0) return;
    const reason = window.prompt(
      `Reason for rejecting ${selectedIds.length} selected listing(s)? (optional)`
    );
    if (reason === null) return;
    bulkUpdateStatus("Rejected", reason);
  };

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected listing(s)? This cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem("token");

      await Promise.all(
        selectedIds.map((id) =>
          fetch(`${API_URL}/api/admin/listings/${id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
        )
      );

      setSelectedIds([]);
      fetchListings();
    } catch (error) {
      alert("Cannot connect to backend server");
    }
  };

  const getDaysPending = (createdAt) => {
    return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  };

  const handleExport = () => {
    exportToCsv("listings.csv", [
      { label: "ID", value: (l) => l.id },
      { label: "Product Type", value: (l) => l.livestock_type },
      { label: "Category", value: (l) => (getCategory(l.livestock_type, l.category) === "product" ? "Farm Product" : "Livestock") },
      { label: "Breed / Variety", value: (l) => l.breed },
      { label: "Farmer", value: (l) => l.farmer_name },
      { label: "Location", value: (l) => l.location },
      { label: "Price", value: (l) => l.price },
      { label: "Unit", value: (l) => l.unit || "head" },
      { label: "Status", value: (l) => (l.status === "Available" ? "Approved" : l.status) },
      { label: "Date Posted", value: (l) => new Date(l.created_at).toLocaleDateString() },
    ], filteredListings);
  };

  const filteredListings = listings.filter((item) => {
    const search = searchText.toLowerCase();

    const matchesSearch =
      item.breed?.toLowerCase().includes(search) ||
      item.livestock_type?.toLowerCase().includes(search) ||
      item.farmer_name?.toLowerCase().includes(search) ||
      item.location?.toLowerCase().includes(search) ||
      String(item.id).includes(search);

    const matchesType =
      typeFilter === "All Types" || matchesTypeFilter(item.livestock_type, typeFilter);

    const displayStatus = item.status === "Available" ? "Approved" : item.status;

    const matchesStatus =
      statusFilter === "All Status" || displayStatus === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  if (loading) {
    return <h2 style={{ padding: "30px" }}>Loading listings...</h2>;
  }

  if (message) {
    return <h2 style={{ padding: "30px", color: "red" }}>{message}</h2>;
  }

  return (
    <div className="admin-listings-page">
      <header className="listings-header">
        <div className="header-left">
          <Link to="/admin-dashboard" className="back-btn">
            <ArrowLeft size={20} />
          </Link>

          <div>
            <span className="eyebrow">MAO Administration</span>
            <h1>Listings Approval</h1>
            <p>
              Review livestock and farm product posts, approve valid listings, flag suspicious
              records, and remove invalid marketplace entries.
            </p>
          </div>
        </div>

        <button className="export-btn" type="button" onClick={handleExport}>
          <ClipboardCheck size={18} />
          Approval Log
        </button>
      </header>

      <section className="listing-kpi-grid">
        <AdminStatCard accent="blue" icon={<ClipboardCheck />} value={stats.totalListings} label="Total Listings" />
        <AdminStatCard accent="amber" icon={<Clock />} value={stats.pendingReview} label="Pending Review" />
        <AdminStatCard accent="green" icon={<BadgeCheck />} value={stats.approved} label="Approved" />
        <AdminStatCard accent="red" icon={<AlertTriangle />} value={stats.flagged} label="Flagged" />
      </section>

      <section className="listing-toolbar">
        <div className="listing-search">
          <Search size={16} />
          <input
            placeholder="Search by product, farmer, ID, or location..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option>All Types</option>
          <ProductTypeOptions />
          {/* A custom type clicked from the dashboard's category chart */}
          {typeFilter !== "All Types" &&
            typeFilter !== "Other" &&
            !ALL_KNOWN_TYPES.includes(typeFilter) && <option>{typeFilter}</option>}
        </select>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option>All Status</option>
          <option>Pending</option>
          <option>Approved</option>
          <option>Flagged</option>
          <option>Rejected</option>
          <option>Draft</option>
        </select>
      </section>

      <section className="listings-layout">
        <div className="listings-table-card">
          <div className="card-title">
            <div>
              <h3>Submitted Listings</h3>
              <p>Listings submitted by farmers for MAO review.</p>
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div className="bulk-action-bar">
              <span>{selectedIds.length} selected</span>

              <div className="bulk-actions">
                <button type="button" className="bulk-approve" onClick={handleBulkApprove}>
                  <CheckCircle size={15} /> Approve
                </button>

                <button type="button" className="bulk-flag" onClick={handleBulkFlag}>
                  <Flag size={15} /> Flag
                </button>

                <button type="button" className="bulk-reject" onClick={handleBulkReject}>
                  <XCircle size={15} /> Reject
                </button>

                <button type="button" className="bulk-delete" onClick={bulkDelete}>
                  <Trash2 size={15} /> Delete
                </button>

                <button
                  type="button"
                  className="bulk-clear"
                  onClick={() => setSelectedIds([])}
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          <div className="table-responsive">
            <table className="professional-table">
              <thead>
                <tr>
                  <th className="checkbox-col">
                    <input
                      type="checkbox"
                      checked={
                        filteredListings.length > 0 &&
                        filteredListings.every((item) => selectedIds.includes(item.id))
                      }
                      ref={(el) => {
                        if (el) {
                          const visibleIds = filteredListings.map((item) => item.id);
                          const selectedVisible = visibleIds.filter((id) =>
                            selectedIds.includes(id)
                          ).length;
                          el.indeterminate =
                            selectedVisible > 0 && selectedVisible < visibleIds.length;
                        }
                      }}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>Listing</th>
                  <th>Farmer</th>
                  <th>Location</th>
                  <th>Price</th>
                  <th>Date Posted</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredListings.length === 0 ? (
                  <tr>
                    <td colSpan="8">No listings found.</td>
                  </tr>
                ) : (
                  filteredListings.map((item) => {
                    const displayStatus =
                      item.status === "Available" ? "Approved" : item.status;

                    const daysPending = getDaysPending(item.created_at);

                    return (
                      <tr key={item.id} className={selectedIds.includes(item.id) ? "row-selected" : ""}>
                        <td className="checkbox-col">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => toggleSelect(item.id)}
                          />
                        </td>

                        <td>
                          <div className="listing-cell">
                            {item.image_url ? (
                              <button
                                type="button"
                                className="listing-thumb-btn"
                                title="View full image"
                                onClick={() => window.open(item.image_url, "_blank")}
                              >
                                <img
                                  className="listing-thumb"
                                  src={item.image_url}
                                  alt={item.breed || item.livestock_type}
                                />
                              </button>
                            ) : (
                              <div className="animal-icon">
                                {getAnimalIcon(item.livestock_type, item.category)}
                              </div>
                            )}
                            <div>
                              <strong>{item.livestock_type}</strong>
                              <p>{item.breed ? `${item.breed} • ` : ""}LST-{item.id}</p>
                            </div>
                          </div>
                        </td>

                        <td>
                          <strong>{item.farmer_name}</strong>
                          <p className="subtext">Farmer Account</p>
                        </td>

                        <td>
                          <div className="location-cell">
                            <MapPin size={15} />
                            {item.location}
                          </div>
                        </td>

                        <td className="price-cell">
                          {formatPrice(item.price, item.unit)}
                        </td>

                        <td className="date-cell">{new Date(item.created_at).toLocaleDateString()}</td>

                        <td>
                          <div className="status-cell">
                            <span
                              className={`status-pill ${displayStatus.toLowerCase()}`}
                              title={item.review_note || undefined}
                            >
                              {displayStatus}
                            </span>

                            {(displayStatus === "Flagged" || displayStatus === "Rejected") &&
                              item.review_note && (
                                <small className="review-note" title={item.review_note}>
                                  {item.review_note}
                                </small>
                              )}

                            {displayStatus === "Pending" && (
                              <small className={`pending-age ${daysPending >= 3 ? "stale" : ""}`}>
                                {daysPending <= 0 ? "Today" : `${daysPending}d pending`}
                              </small>
                            )}
                          </div>
                        </td>

                        <td>
                          <div className="action-set">
                            <button
                              className="approve"
                              title="Approve Listing"
                              type="button"
                              onClick={() => updateStatus(item.id, "Available")}
                            >
                              <CheckCircle size={17} />
                            </button>

                            <button
                              className="flag"
                              title="Flag Listing"
                              type="button"
                              onClick={() => handleFlag(item)}
                            >
                              <Flag size={17} />
                            </button>

                            <button
                              className="reject"
                              title="Reject Listing"
                              type="button"
                              onClick={() => handleReject(item)}
                            >
                              <XCircle size={17} />
                            </button>

                            <button
                              className="delete"
                              title="Delete Listing"
                              type="button"
                              onClick={() => deleteListing(item.id)}
                            >
                              <Trash2 size={17} />
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
        </div>
      </section>
    </div>
  );
}

function getAnimalIcon(type, category) {
  if (type === "Swine") return "🐖";
  if (type === "Cattle") return "🐄";
  if (type === "Goat") return "🐐";
  if (type === "Poultry") return "🐔";
  if (type === "Carabao") return "🐃";
  if (type === "Duck") return "🦆";
  if (type === "Eggs") return "🥚";
  if (type === "Fruits") return "🍎";
  if (type === "Vegetables") return "🥕";
  if (type === "Milk / Dairy") return "🥛";
  if (type === "Honey") return "🍯";
  return getCategory(type, category) === "product" ? "🌱" : "🐾";
}

export default AdminListings;