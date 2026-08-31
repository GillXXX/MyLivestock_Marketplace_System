import { useState, useEffect, useRef } from "react";
import {
  Camera, Mail, Phone, MapPin, ShieldCheck, Pencil, Save,
  ArrowLeft, BadgeCheck, Calendar, Wallet, TrendingUp, User2, Lock,
  LocateFixed, X, Clock, UploadCloud, FileCheck2, AlertTriangle,
} from "lucide-react";

import { Link } from "react-router-dom";
import LeafletMap from "../utils/LeafletMap";
import {
  VERUELA_CENTER,
  VERUELA_BOUNDARY_GEOJSON,
  VERUELA_BARANGAYS,
  findBarangay,
  isInsideVeruela,
} from "../utils/veruelaGeo";
import { API_URL } from "../config";
import "./Profile.css";

function Profile() {
  const fileInputRef = useRef(null);
  const pickerMapRef = useRef(null);
  const govIdInputRef = useRef(null);
  const barangayCertInputRef = useRef(null);
  const [pinError, setPinError] = useState("");
  const [jumpBarangay, setJumpBarangay] = useState("");
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    phone: "",
    location: "",
    farm_location: "",
    farm_lat: null,
    farm_lng: null,
    about: "",
    role: "",
    activeListings: 0,
    totalSales: 0,
    joinedYear: "",
    profile_image: "",
    is_verified: false,
    verification_status: "Not Submitted",
    verification_note: "",
  });

  const [govIdFile, setGovIdFile] = useState(null);
  const [barangayCertFile, setBarangayCertFile] = useState(null);
  const [submittingVerification, setSubmittingVerification] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const imageUrl = profile.profile_image
    ? profile.profile_image.startsWith("http")
      ? profile.profile_image
      : `${API_URL}${profile.profile_image}`
    : "https://images.unsplash.com/photo-1500648767791-00dcc994a43?w=500";

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/farmer/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message);
        return;
      }

      setProfile(data);
      setLoading(false);
    } catch (error) {
      console.error(error);
      alert("Cannot connect to server");
    }
  };

  const handleChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  };

  const handlePinLocation = (lat, lng) => {
    if (!isInsideVeruela(lat, lng)) {
      setPinError("That spot is outside Veruela. Please pin a location within the municipality.");
      return;
    }
    setPinError("");
    setProfile((prev) => ({ ...prev, farm_lat: lat, farm_lng: lng }));
  };

  const handleClearPin = () => {
    setPinError("");
    setProfile((prev) => ({ ...prev, farm_lat: null, farm_lng: null }));
  };

  const handleJumpToBarangay = (e) => {
    const name = e.target.value;
    setJumpBarangay(name);

    const barangay = findBarangay(name);
    if (barangay) {
      pickerMapRef.current?.flyTo(barangay.lat, barangay.lng, 15);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setPinError("Your browser doesn't support device location. Please pin manually.");
      return;
    }

    setLocating(true);
    setPinError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const { latitude, longitude } = position.coords;
        handlePinLocation(latitude, longitude);
        pickerMapRef.current?.flyTo(latitude, longitude, 17);
      },
      (error) => {
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setPinError(
            "Location permission denied. Allow location access, or pin your farm manually on the map."
          );
        } else {
          setPinError("Couldn't get your current location. Please pin manually on the map.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleImageClick = () => {
    if (isEditing) {
      fileInputRef.current.click();
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSelectedImage(null);
    setPinError("");
    fetchProfile();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    setSelectedImage(file);

    setProfile({
      ...profile,
      profile_image: URL.createObjectURL(file),
    });
  };

  const saveProfile = async () => {
    try {
      const token = localStorage.getItem("token");

      const formData = new FormData();

      formData.append("full_name", profile.full_name);
      formData.append("phone", profile.phone);
      formData.append("location", profile.location);
      formData.append("farm_location", profile.farm_location);
      formData.append("farm_lat", profile.farm_lat ?? "");
      formData.append("farm_lng", profile.farm_lng ?? "");
      formData.append("about", profile.about);

      if (selectedImage) {
        formData.append("profile_image", selectedImage);
      }

      const res = await fetch(`${API_URL}/api/farmer/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message);
        return;
      }

      alert("Profile updated successfully!");
      setIsEditing(false);
      setSelectedImage(null);
      fetchProfile();
    } catch (error) {
      console.error(error);
      alert("Update failed");
    }
  };

  const submitVerificationDocument = async () => {
    if (!govIdFile || !barangayCertFile) {
      alert("Please attach both a valid government ID and a barangay certificate");
      return;
    }

    setSubmittingVerification(true);

    try {
      const token = localStorage.getItem("token");

      const formData = new FormData();
      formData.append("government_id", govIdFile);
      formData.append("barangay_certificate", barangayCertFile);

      const res = await fetch(`${API_URL}/api/farmer/verification`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to submit verification");
        setSubmittingVerification(false);
        return;
      }

      alert(data.message);
      setGovIdFile(null);
      setBarangayCertFile(null);
      setSubmittingVerification(false);
      fetchProfile();
    } catch (error) {
      alert("Cannot connect to backend server");
      setSubmittingVerification(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "30px" }}>Loading profile...</div>;
  }

  return (
    <div className="premium-profile-page">
      <div className="profile-page-header">
        <div className="header-left">
          <Link to="/farmer-dashboard" className="back-btn">
            <ArrowLeft size={20} />
          </Link>

          <div>
            <span className="page-tag">ACCOUNT MANAGEMENT</span>
            <h1>Farmer Profile</h1>
            <p>Manage your livestock marketplace account professionally.</p>
          </div>
        </div>
      </div>

      <div className="profile-layout">
        <aside className="profile-sidebar">
          <div className="profile-cover"></div>

          <div className="profile-user">
            <div className="profile-image-wrapper">
              <img src={profile.profile_image?.startsWith("blob:") ? profile.profile_image : imageUrl} alt="profile" />

              <button
                type="button"
                className="camera-btn"
                onClick={handleImageClick}
              >
                <Camera size={16} />
              </button>

              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageChange}
                style={{ display: "none" }}
              />
            </div>

            <div className="profile-user-info">
              <h2>{profile.full_name}</h2>

              <div className="verified-row">
                {profile.is_verified ? (
                  <span className="verified-badge">
                    <BadgeCheck size={15} />
                    Verified Farmer
                  </span>
                ) : (
                  <span
                    className={`verified-badge ${
                      profile.verification_status === "Rejected" ? "rejected" : "pending"
                    }`}
                  >
                    {profile.verification_status === "Rejected" ? (
                      <AlertTriangle size={15} />
                    ) : (
                      <Clock size={15} />
                    )}
                    {profile.verification_status === "Pending"
                      ? "Verification Pending"
                      : profile.verification_status === "Rejected"
                      ? "Verification Rejected"
                      : "Not Verified"}
                  </span>
                )}
              </div>

              <p>{profile.about || "Backyard livestock farmer registered in HerdMarket."}</p>
            </div>
          </div>

          <div className="profile-stats">
            <div className="stat-box tone-green">
              <span className="stat-icon"><TrendingUp size={20} /></span>
              <div>
                <h3>{profile.activeListings}</h3>
                <span>Active Listings</span>
              </div>
            </div>

            <div className="stat-box tone-gold">
              <span className="stat-icon"><Wallet size={20} /></span>
              <div>
                <h3>₱{Number(profile.totalSales).toLocaleString()}</h3>
                <span>Total Sales</span>
              </div>
            </div>

            <div className="stat-box tone-teal">
              <span className="stat-icon"><Calendar size={20} /></span>
              <div>
                <h3>{profile.joinedYear}</h3>
                <span>Joined Marketplace</span>
              </div>
            </div>
          </div>

          <div className="account-status-card">
            <div className="status-top">
              <ShieldCheck size={22} />
              <div>
                <h4>Account Security</h4>
                <p>Your account is protected.</p>
              </div>
            </div>

            <Link to="/farmer-settings">
              <Lock size={16} />
              Security Settings
            </Link>
          </div>
        </aside>

        <main className="profile-main">
          <div className="profile-actions">
            {isEditing ? (
              <>
                <button className="cancel-btn" onClick={handleCancelEdit}>
                  <X size={18} />
                  Cancel
                </button>

                <button className="save-btn" onClick={saveProfile}>
                  <Save size={18} />
                  Save Changes
                </button>
              </>
            ) : (
              <button className="edit-btn" onClick={() => setIsEditing(true)}>
                <Pencil size={18} />
                Edit Profile
              </button>
            )}
          </div>

          <div className="profile-form-card">
            <div className="section-title">
              <User2 size={18} />
              <h3>Personal Information</h3>
            </div>

            <div className="profile-form-grid">
              <div className="form-group">
                <label>Full Name</label>
                <div className="input-wrapper">
                  <User2 size={18} />
                  <input
                    type="text"
                    name="full_name"
                    value={profile.full_name}
                    onChange={handleChange}
                    readOnly={!isEditing}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <div className="input-wrapper">
                  <Mail size={18} />
                  <input type="email" value={profile.email} readOnly />
                </div>
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <div className="input-wrapper">
                  <Phone size={18} />
                  <input
                    type="text"
                    name="phone"
                    value={profile.phone}
                    onChange={handleChange}
                    readOnly={!isEditing}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Location</label>
                <div className="input-wrapper">
                  <MapPin size={18} />
                  <input
                    type="text"
                    name="location"
                    value={profile.location}
                    onChange={handleChange}
                    readOnly={!isEditing}
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label>Farm / Barangay Location</label>
                <div className="input-wrapper">
                  <MapPin size={18} />
                  <input
                    type="text"
                    name="farm_location"
                    value={profile.farm_location || ""}
                    onChange={handleChange}
                    readOnly={!isEditing}
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label className="map-pin-label">
                  <LocateFixed size={16} /> Exact Farm Location on Map
                  {isEditing && profile.farm_lat != null && (
                    <button
                      type="button"
                      className="clear-pin-btn"
                      onClick={handleClearPin}
                    >
                      <X size={13} /> Clear pin
                    </button>
                  )}
                </label>

                {isEditing ? (
                  <>
                    <p className="map-pin-hint">
                      For the most accurate pin, stand at your farm and tap "Use My
                      Current Location," or jump to your barangay and click your exact
                      spot. Switch to satellite view to recognize your land visually.
                    </p>

                    <div className="map-picker-toolbar">
                      <select
                        className="barangay-jump-select"
                        value={jumpBarangay}
                        onChange={handleJumpToBarangay}
                      >
                        <option value="">Jump to barangay...</option>
                        {VERUELA_BARANGAYS.map((barangay) => (
                          <option key={barangay.name} value={barangay.name}>
                            {barangay.name}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        className="use-location-btn"
                        onClick={handleUseMyLocation}
                        disabled={locating}
                      >
                        <LocateFixed size={16} />
                        {locating ? "Locating..." : "Use My Current Location"}
                      </button>
                    </div>

                    <LeafletMap
                      ref={pickerMapRef}
                      center={
                        profile.farm_lat != null
                          ? [Number(profile.farm_lat), Number(profile.farm_lng)]
                          : VERUELA_CENTER
                      }
                      zoom={profile.farm_lat != null ? 15 : 12}
                      height="280px"
                      onMapClick={handlePinLocation}
                      pickedPosition={
                        profile.farm_lat != null
                          ? [Number(profile.farm_lat), Number(profile.farm_lng)]
                          : null
                      }
                      boundary={VERUELA_BOUNDARY_GEOJSON}
                      barangayLabels={VERUELA_BARANGAYS}
                      layerToggle
                    />

                    {pinError && <p className="map-pin-error">{pinError}</p>}
                  </>
                ) : profile.farm_lat != null ? (
                  <LeafletMap
                    center={[Number(profile.farm_lat), Number(profile.farm_lng)]}
                    zoom={15}
                    height="220px"
                    boundary={VERUELA_BOUNDARY_GEOJSON}
                    markers={[
                      {
                        id: "farm",
                        lat: Number(profile.farm_lat),
                        lng: Number(profile.farm_lng),
                        color: "#b8842c",
                        shape: "pin",
                      },
                    ]}
                  />
                ) : (
                  <p className="map-pin-hint">
                    No exact location pinned yet. Click "Edit Profile" to pin your farm
                    on the map.
                  </p>
                )}
              </div>

              <div className="form-group full-width">
                <label>Role</label>
                <div className="input-wrapper">
                  <ShieldCheck size={18} />
                  <input type="text" value={profile.role} readOnly />
                </div>
              </div>

              <div className="form-group full-width">
                <label>About Farmer</label>
                <textarea
                  rows="5"
                  name="about"
                  value={profile.about || ""}
                  onChange={handleChange}
                  readOnly={!isEditing}
                />
              </div>
            </div>
          </div>

          {!profile.is_verified && (
            <div className="profile-form-card verification-card">
              <div className="section-title">
                <span className="section-icon-badge">
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <h3>Account Verification</h3>
                  <p className="section-subtitle">
                    Verified accounts get a trust badge buyers can see on every listing.
                  </p>
                </div>
              </div>

              {profile.verification_status === "Pending" ? (
                <div className="verification-notice pending">
                  <Clock size={18} />
                  <div>
                    <strong>Awaiting MAO review</strong>
                    <p>Your documents were submitted and are being reviewed.</p>
                  </div>
                </div>
              ) : (
                <>
                  {profile.verification_status === "Rejected" && (
                    <div className="verification-notice rejected">
                      <AlertTriangle size={18} />
                      <div>
                        <strong>Your last submission was rejected</strong>
                        <p>{profile.verification_note || "Please review and resubmit your documents."}</p>
                      </div>
                    </div>
                  )}

                  <p className="map-pin-hint">
                    Submit a valid government ID and a barangay certificate so MAO can
                    verify your account.
                  </p>

                  <div className="verification-upload-grid">
                    <button
                      type="button"
                      className={`upload-dropzone ${govIdFile ? "has-file" : ""}`}
                      onClick={() => govIdInputRef.current.click()}
                    >
                      {govIdFile ? <FileCheck2 size={22} /> : <UploadCloud size={22} />}
                      <strong>Valid Government ID</strong>
                      <span>{govIdFile ? govIdFile.name : "Click to choose a file"}</span>
                      <input
                        ref={govIdInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        hidden
                        onChange={(e) => setGovIdFile(e.target.files[0] || null)}
                      />
                    </button>

                    <button
                      type="button"
                      className={`upload-dropzone ${barangayCertFile ? "has-file" : ""}`}
                      onClick={() => barangayCertInputRef.current.click()}
                    >
                      {barangayCertFile ? <FileCheck2 size={22} /> : <UploadCloud size={22} />}
                      <strong>Barangay Certificate</strong>
                      <span>{barangayCertFile ? barangayCertFile.name : "Click to choose a file"}</span>
                      <input
                        ref={barangayCertInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        hidden
                        onChange={(e) => setBarangayCertFile(e.target.files[0] || null)}
                      />
                    </button>
                  </div>

                  <button
                    type="button"
                    className="save-btn"
                    onClick={submitVerificationDocument}
                    disabled={submittingVerification}
                  >
                    <Save size={18} />
                    {submittingVerification ? "Submitting..." : "Submit for Verification"}
                  </button>
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Profile;