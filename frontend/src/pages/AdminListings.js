import { useEffect, useState } from "react";

import {
  Search,
  Eye,
  CheckCircle,
  AlertTriangle,
  Trash2,
  ArrowLeft,
  Filter,
  MapPin,
  MoreHorizontal,
  ClipboardCheck,
  Clock,
  BadgeCheck,
  XCircle,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import "./AdminListings.css";

function AdminListings() {
  const navigate = useNavigate();

  const [listings, setListings] = useState([]);
  const [stats, setStats] = useState({
    totalListings: 0,
    pendingReview: 0,
    approved: 0,
    flagged: 0,
  });

  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Livestock Types");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchListings = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch("http://localhost:5000/api/admin/listings", {
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
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`http://localhost:5000/api/admin/listings/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
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

  const deleteListing = async (id) => {
    const confirmDelete = window.confirm("Delete this listing?");
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`http://localhost:5000/api/admin/listings/${id}`, {
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

  const filteredListings = listings.filter((item) => {
    const search = searchText.toLowerCase();

    const matchesSearch =
      item.breed?.toLowerCase().includes(search) ||
      item.livestock_type?.toLowerCase().includes(search) ||
      item.farmer_name?.toLowerCase().includes(search) ||
      item.location?.toLowerCase().includes(search) ||
      String(item.id).includes(search);

    const matchesType =
      typeFilter === "All Livestock Types" || item.livestock_type === typeFilter;

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
              Review livestock posts, approve valid listings, flag suspicious
              records, and remove invalid marketplace entries.
            </p>
          </div>
        </div>

        <button className="export-btn" type="button">
          <ClipboardCheck size={18} />
          Approval Log
        </button>
      </header>

      <section className="listing-kpi-grid">
        <Kpi icon={<ClipboardCheck />} value={stats.totalListings} label="Total Listings" />
        <Kpi icon={<Clock />} value={stats.pendingReview} label="Pending Review" />
        <Kpi icon={<BadgeCheck />} value={stats.approved} label="Approved" />
        <Kpi icon={<AlertTriangle />} value={stats.flagged} label="Flagged" />
      </section>

      <section className="listing-toolbar">
        <div className="listing-search">
          <Search size={18} />
          <input
            placeholder="Search by livestock, farmer, ID, or location..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option>All Livestock Types</option>
          <option>Swine</option>
          <option>Cattle</option>
          <option>Goat</option>
          <option>Poultry</option>
        </select>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option>All Status</option>
          <option>Pending</option>
          <option>Approved</option>
          <option>Flagged</option>
          <option>Rejected</option>
        </select>

        <button className="filter-btn" type="button">
          <Filter size={17} />
          Apply Filter
        </button>
      </section>

      <section className="listings-layout">
        <div className="listings-table-card">
          <div className="card-title">
            <div>
              <h3>Submitted Livestock Listings</h3>
              <p>Listings submitted by farmers for MAO review.</p>
            </div>

            <button className="more-btn" type="button">
              <MoreHorizontal size={20} />
            </button>
          </div>

          <div className="table-responsive">
            <table className="professional-table">
              <thead>
                <tr>
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
                    <td colSpan="7">No listings found.</td>
                  </tr>
                ) : (
                  filteredListings.map((item) => {
                    const displayStatus =
                      item.status === "Available" ? "Approved" : item.status;

                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="listing-cell">
                            <div className="animal-icon">
                              {getAnimalIcon(item.livestock_type)}
                            </div>
                            <div>
                              <strong>{item.livestock_type}</strong>
                              <p>{item.breed} • LST-{item.id}</p>
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

                        <td>
                          <strong>₱{Number(item.price).toLocaleString()}</strong>
                        </td>

                        <td>{new Date(item.created_at).toLocaleDateString()}</td>

                        <td>
                          <span className={`status-pill ${displayStatus.toLowerCase()}`}>
                            {displayStatus}
                          </span>
                        </td>

                        <td>
                          <div className="action-set">
                            <button title="View Details" type="button">
                              <Eye size={17} />
                            </button>

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
                              onClick={() => updateStatus(item.id, "Flagged")}
                            >
                              <AlertTriangle size={17} />
                            </button>

                            <button
                              className="reject"
                              title="Reject Listing"
                              type="button"
                              onClick={() => updateStatus(item.id, "Rejected")}
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

        <aside className="approval-panel">
          <h3>Review Guidelines</h3>
          <p>
            Before approving a listing, ensure that the livestock details are
            complete and valid.
          </p>

          <div className="guideline">
            <CheckCircle size={18} />
            Complete livestock type, breed, age, and weight
          </div>

          <div className="guideline">
            <CheckCircle size={18} />
            Clear livestock photo uploaded
          </div>

          <div className="guideline">
            <CheckCircle size={18} />
            Reasonable price and valid seller location
          </div>

          <div className="guideline warning">
            <AlertTriangle size={18} />
            Flag listings with suspicious details
          </div>

          <div className="approval-summary">
            <div>
              <strong>Today’s Reviews</strong>
              <span>{stats.pendingReview} pending listings</span>
            </div>

            <div>
              <strong>Average Approval Time</strong>
              <span>12 minutes</span>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function Kpi({ icon, value, label }) {
  return (
    <div className="listing-kpi-card">
      <div className="kpi-icon">{icon}</div>
      <h2>{value}</h2>
      <p>{label}</p>
    </div>
  );
}

function getAnimalIcon(type) {
  if (type === "Swine") return "🐖";
  if (type === "Cattle") return "🐄";
  if (type === "Goat") return "🐐";
  if (type === "Poultry") return "🐔";
  return "🐾";
}

export default AdminListings;