import { useEffect, useRef, useState } from "react";

import {
  Camera,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Pencil,
  Save,
  ArrowLeft,
  BadgeCheck,
  Calendar,
  Wallet,
  TrendingUp,
  User2,
  Lock,
  ShoppingBag,
  X,
  CheckCircle2,
  Circle,
  ChevronRight,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import { API_URL, DEFAULT_AVATAR } from "../config";
import useGoBack from "../utils/useGoBack";
import "./Profile.css";

function BuyerProfile() {
  const navigate = useNavigate();
  const goBack = useGoBack("/buyer-dashboard");
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    activeInquiries: 0,
    completedPurchases: 0,
    purchaseValue: 0,
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const defaultImage = DEFAULT_AVATAR;

  const imageUrl = profile?.profile_image
    ? profile.profile_image.startsWith("http")
      ? profile.profile_image
      : `${API_URL}${profile.profile_image}`
    : defaultImage;

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch(`${API_URL}/api/buyer/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Failed to load profile");
        setLoading(false);
        return;
      }

      setProfile(data.user);
      setStats(data.stats);
      setLoading(false);
    } catch (error) {
      setMessage("Cannot connect to backend server");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleImageClick = () => {
    if (isEditing) {
      fileInputRef.current.click();
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedImage(file);
    setProfile({ ...profile, profile_image: URL.createObjectURL(file) });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSelectedImage(null);
    fetchProfile();
  };

  const saveProfile = async () => {
    try {
      const token = localStorage.getItem("token");

      const formData = new FormData();
      formData.append("full_name", profile.full_name || "");
      formData.append("phone", profile.phone || "");
      formData.append("location", profile.location || "");
      formData.append("about", profile.about || "");

      if (selectedImage) {
        formData.append("profile_image", selectedImage);
      }

      const res = await fetch(`${API_URL}/api/buyer/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to update profile");
        return;
      }

      alert("Profile updated successfully!");
      setIsEditing(false);
      setSelectedImage(null);
      fetchProfile();
    } catch (error) {
      alert("Cannot connect to backend server");
    }
  };

  if (loading) return <h2 style={{ padding: "30px" }}>Loading buyer profile...</h2>;
  if (message) return <h2 style={{ padding: "30px", color: "red" }}>{message}</h2>;

  const securityChecks = [
    { label: "Password protected", done: true },
    { label: "Contact number added", done: Boolean(profile.phone) },
    { label: "Profile photo added", done: Boolean(profile.profile_image) },
  ];
  const securityDone = securityChecks.filter((check) => check.done).length;
  const securityPercent = Math.round((securityDone / securityChecks.length) * 100);

  return (
    <div className={`premium-profile-page buyer-profile-page ${isEditing ? "editing" : ""}`}>
      <div className="profile-page-header">
        <div className="header-left">
          <button type="button" className="back-btn" onClick={goBack} aria-label="Go back">
            <ArrowLeft size={20} />
          </button>

          <div>
            <span className="page-tag">ACCOUNT MANAGEMENT</span>
            <h1>Buyer Profile</h1>
            <p>
              Manage your buyer account, marketplace identity, and livestock
              purchasing activity.
            </p>
          </div>
        </div>
      </div>

      <div className="profile-layout">
        <aside className="profile-sidebar">
          <div className="profile-cover"></div>

          <div className="profile-user">
            <div className="profile-image-wrapper">
              <img
                src={
                  profile.profile_image?.startsWith("blob:")
                    ? profile.profile_image
                    : imageUrl
                }
                alt="profile"
              />

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
                <span className="verified-badge">
                  <BadgeCheck size={15} />
                  Buyer Account
                </span>
              </div>

              <p>
                {profile.about ||
                  "Livestock buyer using VOLT to browse verified listings, inquire with farmers, and track purchase transactions."}
              </p>
            </div>
          </div>

          <div className="profile-stats">
            <div className="stat-box tone-green">
              <span className="stat-icon">
                <TrendingUp size={20} />
              </span>
              <div>
                <h3>{stats.activeInquiries}</h3>
                <span>Active Inquiries</span>
              </div>
            </div>

            <div className="stat-box tone-gold">
              <span className="stat-icon">
                <ShoppingBag size={20} />
              </span>
              <div>
                <h3>{stats.completedPurchases}</h3>
                <span>Completed Purchases</span>
              </div>
            </div>

            <div className="stat-box tone-teal">
              <span className="stat-icon">
                <Wallet size={20} />
              </span>
              <div>
                <h3>₱{Number(stats.purchaseValue).toLocaleString()}</h3>
                <span>Total Purchase Value</span>
              </div>
            </div>

            <div className="stat-box tone-terracotta">
              <span className="stat-icon">
                <Calendar size={20} />
              </span>
              <div>
                <h3>{new Date(profile.created_at).getFullYear()}</h3>
                <span>Joined Marketplace</span>
              </div>
            </div>
          </div>

          <div className="account-status-card">
            <div className="status-top">
              <div
                className="security-ring"
                style={{ "--security-pct": `${securityPercent * 3.6}deg` }}
              >
                <div className="security-ring-inner">
                  <ShieldCheck size={18} />
                </div>
              </div>

              <div>
                <h4>Account Security</h4>
                <p>
                  {securityDone === securityChecks.length
                    ? "Fully protected"
                    : `${securityDone} of ${securityChecks.length} safeguards active`}
                </p>
              </div>

              <span className="security-score">{securityPercent}%</span>
            </div>

            <ul className="security-checklist">
              {securityChecks.map((check) => (
                <li key={check.label} className={check.done ? "is-done" : "is-pending"}>
                  {check.done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                  {check.label}
                </li>
              ))}
            </ul>

            <Link to="/buyer-settings" className="security-cta">
              <Lock size={16} />
              Security Settings
              <ChevronRight size={15} className="security-cta-arrow" />
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
                    maxLength={100}
                    value={profile.full_name || ""}
                    onChange={handleChange}
                    readOnly={!isEditing}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email Address</label>

                <div className="input-wrapper">
                  <Mail size={18} />
                  <input type="email" value={profile.email || ""} readOnly />
                </div>
              </div>

              <div className="form-group">
                <label>Phone Number</label>

                <div className="input-wrapper">
                  <Phone size={18} />
                  <input
                    type="text"
                    name="phone"
                    maxLength={30}
                    value={profile.phone || ""}
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
                    maxLength={150}
                    value={profile.location || ""}
                    onChange={handleChange}
                    readOnly={!isEditing}
                  />
                </div>
              </div>

              <div className="form-group full-width role-field">
                <label>Role</label>

                <div className="input-wrapper">
                  <ShieldCheck size={18} />
                  <input type="text" value={profile.role || ""} readOnly />
                </div>
              </div>

              <div className="form-group full-width">
                <label>About Buyer</label>

                <textarea
                  rows="6"
                  name="about"
                  maxLength={1000}
                  value={profile.about || ""}
                  onChange={handleChange}
                  readOnly={!isEditing}
                  placeholder="Tell sellers a bit about what you're looking for..."
                ></textarea>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default BuyerProfile;
