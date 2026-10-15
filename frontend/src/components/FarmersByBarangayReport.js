import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, MapPin, Users } from "lucide-react";
import { API_URL } from "../config";
import { exportToCsv } from "../utils/exportCsv";
import "./FarmersByBarangayReport.css";

const ALL = "All";
const NOT_SPECIFIED = "Not specified";

const barangayOf = (farmer) => farmer.barangay || NOT_SPECIFIED;

// Farmers registered in each of Veruela's barangays, filterable by
// barangay, purok and verification. Clicking a barangay in the summary
// narrows the farmer list below to it. Farmers who haven't picked a
// barangay on their profile yet are counted under "Not specified".
function FarmersByBarangayReport() {
  const [barangays, setBarangays] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [barangayFilter, setBarangayFilter] = useState(ALL);
  const [purokFilter, setPurokFilter] = useState(ALL);
  const [verifiedFilter, setVerifiedFilter] = useState(ALL);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/reports/farmers-by-barangay`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();

        if (!res.ok) {
          setMessage(data.message || "Failed to load farmers by barangay");
        } else {
          setBarangays(data.barangays);
          setFarmers(data.farmers);
        }
      } catch (error) {
        setMessage("Cannot connect to backend server");
      }
      setLoading(false);
    };

    load();
  }, []);

  // Verification narrows both the summary and the list; barangay and purok
  // only narrow the list, so the summary keeps showing every barangay.
  const verifiedFarmers = useMemo(
    () =>
      farmers.filter((f) =>
        verifiedFilter === ALL ? true : verifiedFilter === "Verified" ? f.is_verified : !f.is_verified
      ),
    [farmers, verifiedFilter]
  );

  const summary = useMemo(() => {
    const rows = [...barangays, NOT_SPECIFIED].map((name) => ({
      name,
      farmers: 0,
      verified: 0,
      withListings: 0,
      livestockHead: 0,
    }));
    const byName = new Map(rows.map((row) => [row.name, row]));

    for (const farmer of verifiedFarmers) {
      const row = byName.get(barangayOf(farmer)) || byName.get(NOT_SPECIFIED);
      row.farmers += 1;
      if (farmer.is_verified) row.verified += 1;
      if (farmer.activeListings > 0) row.withListings += 1;
      row.livestockHead += Number(farmer.livestockHead) || 0;
    }

    return rows;
  }, [barangays, verifiedFarmers]);

  const totals = summary.reduce(
    (sum, row) => ({
      farmers: sum.farmers + row.farmers,
      verified: sum.verified + row.verified,
      withListings: sum.withListings + row.withListings,
      livestockHead: sum.livestockHead + row.livestockHead,
    }),
    { farmers: 0, verified: 0, withListings: 0, livestockHead: 0 }
  );

  // Puroks actually recorded in the chosen barangay (or anywhere).
  const purokOptions = useMemo(() => {
    const set = new Set(
      farmers
        .filter((f) => barangayFilter === ALL || barangayOf(f) === barangayFilter)
        .map((f) => f.purok)
        .filter(Boolean)
    );
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [farmers, barangayFilter]);

  const listedFarmers = verifiedFarmers.filter(
    (f) =>
      (barangayFilter === ALL || barangayOf(f) === barangayFilter) &&
      (purokFilter === ALL || f.purok === purokFilter)
  );

  const chooseBarangay = (name) => {
    setBarangayFilter(name);
    setPurokFilter(ALL);
  };

  const handleExport = () => {
    exportToCsv("farmers-by-barangay.csv", [
      { label: "Farmer", value: (f) => f.full_name },
      { label: "Barangay", value: (f) => barangayOf(f) },
      { label: "Purok", value: (f) => f.purok || "" },
      { label: "Sitio / Street", value: (f) => f.sitio || "" },
      { label: "Phone", value: (f) => f.phone || "" },
      { label: "Verified", value: (f) => (f.is_verified ? "Yes" : "No") },
      { label: "Active Listings", value: (f) => f.activeListings },
      { label: "Livestock (head)", value: (f) => f.livestockHead },
      { label: "Registered", value: (f) => new Date(f.created_at).toLocaleDateString() },
    ], listedFarmers);
  };

  return (
    <section className="reports-layout single">
      <div className="report-card large barangay-report">
        <div className="card-title">
          <div>
            <h3>Farmers by Barangay</h3>
            <p>Registered farmers in each of Veruela's {barangays.length || 20} barangays.</p>
          </div>

          <span className="card-icon-badge">
            <MapPin size={20} />
          </span>
        </div>

        {loading ? (
          <p className="barangay-report-note">Loading farmers...</p>
        ) : message ? (
          <p className="barangay-report-note error">{message}</p>
        ) : (
          <>
            <div className="barangay-report-filters">
              <select value={barangayFilter} onChange={(e) => chooseBarangay(e.target.value)}>
                <option value={ALL}>All Barangays</option>
                {[...barangays, NOT_SPECIFIED].map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>

              <select value={purokFilter} onChange={(e) => setPurokFilter(e.target.value)}>
                <option value={ALL}>All Puroks</option>
                {purokOptions.map((purok) => (
                  <option key={purok} value={purok}>
                    {purok}
                  </option>
                ))}
              </select>

              <select value={verifiedFilter} onChange={(e) => setVerifiedFilter(e.target.value)}>
                <option value={ALL}>All Farmers</option>
                <option value="Verified">Verified only</option>
                <option value="Not verified">Not verified</option>
              </select>

              <button type="button" className="barangay-report-export" onClick={handleExport}>
                <FileSpreadsheet size={16} />
                Export CSV
              </button>
            </div>

            <div className="barangay-table-wrap">
              <table className="barangay-table">
                <thead>
                  <tr>
                    <th>Barangay</th>
                    <th>Farmers</th>
                    <th>Verified</th>
                    <th>With Active Listings</th>
                    <th>Livestock Listed (head)</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((row) => (
                    <tr
                      key={row.name}
                      className={`${barangayFilter === row.name ? "selected" : ""} ${
                        row.name === NOT_SPECIFIED ? "unspecified" : ""
                      }`}
                      onClick={() => chooseBarangay(barangayFilter === row.name ? ALL : row.name)}
                      title={barangayFilter === row.name ? "Show all barangays" : `Show farmers in ${row.name}`}
                    >
                      <td>{row.name}</td>
                      <td>{row.farmers}</td>
                      <td>{row.verified}</td>
                      <td>{row.withListings}</td>
                      <td>{row.livestockHead.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td>{totals.farmers}</td>
                    <td>{totals.verified}</td>
                    <td>{totals.withListings}</td>
                    <td>{totals.livestockHead.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <h4 className="barangay-list-title">
              <Users size={16} />
              {barangayFilter === ALL ? "All farmers" : barangayFilter}
              {purokFilter !== ALL ? ` · ${purokFilter}` : ""}
              <span>{listedFarmers.length}</span>
            </h4>

            <div className="barangay-table-wrap">
              <table className="barangay-table">
                <thead>
                  <tr>
                    <th>Farmer</th>
                    <th>Barangay</th>
                    <th>Purok</th>
                    <th>Sitio / Street</th>
                    <th>Phone</th>
                    <th>Verified</th>
                    <th>Active Listings</th>
                  </tr>
                </thead>
                <tbody>
                  {listedFarmers.length === 0 ? (
                    <tr>
                      <td colSpan="7">No farmers match these filters.</td>
                    </tr>
                  ) : (
                    listedFarmers.map((farmer) => (
                      <tr key={farmer.id}>
                        <td>{farmer.full_name}</td>
                        <td>{barangayOf(farmer)}</td>
                        <td>{farmer.purok || "—"}</td>
                        <td>{farmer.sitio || "—"}</td>
                        <td>{farmer.phone || "—"}</td>
                        <td>
                          <span className={`barangay-pill ${farmer.is_verified ? "yes" : "no"}`}>
                            {farmer.is_verified ? "Verified" : "Not verified"}
                          </span>
                        </td>
                        <td>{farmer.activeListings}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default FarmersByBarangayReport;
