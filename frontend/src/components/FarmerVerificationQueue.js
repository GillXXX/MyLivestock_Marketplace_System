import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, CheckCircle, FileText, MapPin, Phone, UserCheck, XCircle, X } from "lucide-react";
import { API_URL } from "../config";
import "./FarmerVerificationQueue.css";

// Quick picks for the most common problems; the reviewer can edit or
// write their own.
const REJECT_REASONS = [
  "ID is blurry or unreadable",
  "Name doesn't match the account",
  "Barangay certificate is missing or invalid",
  "Not a resident of Veruela",
];

// Verification documents come back as signed links on this server
// ("/private-files/..."); older ones may still be full public URLs.
const docHref = (url) => (url && url.startsWith("/") ? `${API_URL}${url}` : url);

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

const parseDocs = (value) => {
  try {
    const docs = JSON.parse(value || "[]");
    return Array.isArray(docs) ? docs : [];
  } catch (error) {
    return [];
  }
};

// Farmers who submitted a government ID and barangay certificate and are
// waiting for their account to be verified. MAO staff and the Super Admin
// approve or reject them here; a verified farmer can then post listings.
function FarmerVerificationQueue() {
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/verification-queue`, { headers: authHeaders() });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Failed to load farmer verifications");
      } else {
        setFarmers(data.farmers);
        setMessage("");
      }
    } catch (error) {
      setMessage("Cannot connect to backend server");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (farmer, action, reason) => {
    setBusyId(farmer.id);

    try {
      const res = await fetch(
        `${API_URL}/api/admin/users/${farmer.id}/${action === "approve" ? "verify" : "reject-verification"}`,
        {
          method: "PUT",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(action === "reject" ? { reason } : {}),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to update the verification");
        return false;
      }

      await load();
      return true;
    } catch (error) {
      alert("Cannot connect to backend server");
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const submitReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) return;

    const ok = await review(rejectTarget, "reject", rejectReason.trim());
    if (ok) setRejectTarget(null);
  };

  return (
    <section className="farmer-queue">
      <div className="farmer-queue-header">
        <div>
          <h3>
            <BadgeCheck size={19} />
            Farmer Account Verification
          </h3>
          <p>
            Check each farmer's valid ID and barangay certificate. Verified farmers can post listings.
          </p>
        </div>
        <span className="farmer-queue-count">{farmers.length} waiting</span>
      </div>

      {loading ? (
        <p className="farmer-queue-empty">Loading farmer verifications...</p>
      ) : message ? (
        <p className="farmer-queue-empty error">{message}</p>
      ) : farmers.length === 0 ? (
        <p className="farmer-queue-empty">
          <CheckCircle size={16} />
          No farmers are waiting for verification.
        </p>
      ) : (
        <div className="farmer-queue-list">
          {farmers.map((farmer) => {
            const docs = parseDocs(farmer.verification_document);
            const area = [farmer.purok, farmer.barangay].filter(Boolean).join(", ") || farmer.farm_location;

            return (
              <div className="farmer-queue-item" key={farmer.id}>
                <div className="farmer-queue-info">
                  <strong>{farmer.full_name}</strong>
                  <div className="farmer-queue-meta">
                    {area && (
                      <span>
                        <MapPin size={13} />
                        {area}
                      </span>
                    )}
                    {farmer.phone && (
                      <span>
                        <Phone size={13} />
                        {farmer.phone}
                      </span>
                    )}
                    {farmer.verification_submitted_at && (
                      <span>Submitted {new Date(farmer.verification_submitted_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                <div className="farmer-queue-docs">
                  {docs.length === 0 ? (
                    <span className="farmer-queue-nodocs">No documents attached</span>
                  ) : (
                    docs.map((doc) => (
                      <a
                        key={doc.type}
                        className="farmer-queue-doc"
                        href={docHref(doc.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FileText size={14} />
                        {doc.type}
                      </a>
                    ))
                  )}
                </div>

                <div className="farmer-queue-actions">
                  <button
                    type="button"
                    className="approve"
                    disabled={busyId === farmer.id}
                    onClick={() => review(farmer, "approve")}
                  >
                    <UserCheck size={15} />
                    Approve
                  </button>
                  <button
                    type="button"
                    className="reject"
                    disabled={busyId === farmer.id}
                    onClick={() => {
                      setRejectTarget(farmer);
                      setRejectReason("");
                    }}
                  >
                    <XCircle size={15} />
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rejectTarget && (
        <div className="doc-modal-overlay" onClick={() => busyId === null && setRejectTarget(null)}>
          <form className="doc-modal reject-modal" onClick={(e) => e.stopPropagation()} onSubmit={submitReject}>
            <button
              className="doc-modal-close"
              type="button"
              aria-label="Close"
              onClick={() => setRejectTarget(null)}
              disabled={busyId !== null}
            >
              <X size={18} />
            </button>

            <h3>Reject verification</h3>
            <p className="reject-modal-subtitle">
              {rejectTarget.full_name}'s account stays unverified. They see this reason on their profile and can
              resubmit their documents.
            </p>

            <div className="reject-reason-chips">
              {REJECT_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  className={rejectReason === reason ? "active" : ""}
                  onClick={() => setRejectReason(reason)}
                >
                  {reason}
                </button>
              ))}
            </div>

            <label className="reject-reason-label" htmlFor="farmer-reject-reason">
              Reason
            </label>
            <textarea
              id="farmer-reject-reason"
              rows={3}
              maxLength={500}
              placeholder="Explain what's wrong and what the farmer should resubmit"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              required
              autoFocus
            />

            <div className="reject-modal-actions">
              <button
                type="button"
                className="reject-cancel"
                onClick={() => setRejectTarget(null)}
                disabled={busyId !== null}
              >
                Cancel
              </button>
              <button type="submit" className="reject-confirm" disabled={busyId !== null || !rejectReason.trim()}>
                <XCircle size={16} />
                {busyId !== null ? "Rejecting..." : "Reject verification"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

export default FarmerVerificationQueue;
