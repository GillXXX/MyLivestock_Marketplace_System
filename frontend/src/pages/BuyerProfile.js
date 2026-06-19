import { useEffect, useState } from "react";

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
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import "./Profile.css";

function BuyerProfile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    activeInquiries: 0,
    completedPurchases: 0,
    purchaseValue: 0,
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const res = await fetch("http://localhost:5000/api/buyer/profile", {
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

    fetchProfile();
  }, [navigate]);

  if (loading) return <h2 style={{ padding: "30px" }}>Loading buyer profile...</h2>;
  if (message) return <h2 style={{ padding: "30px", color: "red" }}>{message}</h2>;

  return (
    <div className="premium-profile-page">
      <div className="profile-page-header">
        <div className="header-left">
          <Link to="/buyer-dashboard" className="back-btn">
            <ArrowLeft size={20} />
          </Link>

          <div>
            <span className="page-tag">ACCOUNT MANAGEMENT</span>
            <h1>Buyer Profile</h1>
            <p>
              Manage your buyer account, marketplace identity, and livestock purchasing activity.
            </p>
          </div>
        </div>
      </div>

      <div className="profile-layout">
        <aside className="profile-sidebar">
          <div className="profile-cover"></div>

          <div className="profile-user">
            <div className="profile-image-wrapper">
              <img src="https://i.pravatar.cc/300" alt="profile" />

              <button className="camera-btn">
                <Camera size={16} />
              </button>
            </div>

            <div className="profile-user-info">
              <h2>{profile.full_name}</h2>

              <div className="verified-row">
                <span className="verified-badge">
                  <BadgeCheck size={15} />
                  Verified Buyer
                </span>
              </div>

              <p>
                Livestock buyer using HerdMarket to browse verified livestock,
                inquire with farmers, and track purchase transactions.
              </p>
            </div>
          </div>

          <div className="profile-stats">
            <div className="stat-box">
              <TrendingUp size={20} />
              <div>
                <h3>{stats.activeInquiries}</h3>
                <span>Active Inquiries</span>
              </div>
            </div>

            <div className="stat-box">
              <ShoppingBag size={20} />
              <div>
                <h3>{stats.completedPurchases}</h3>
                <span>Completed Purchases</span>
              </div>
            </div>

            <div className="stat-box">
              <Wallet size={20} />
              <div>
                <h3>₱{Number(stats.purchaseValue).toLocaleString()}</h3>
                <span>Total Purchase Value</span>
              </div>
            </div>

            <div className="stat-box">
              <Calendar size={20} />
              <div>
                <h3>{new Date(profile.created_at).getFullYear()}</h3>
                <span>Joined Marketplace</span>
              </div>
            </div>
          </div>

          <div className="account-status-card">
            <div className="status-top">
              <ShieldCheck size={22} />

              <div>
                <h4>Account Security</h4>
                <p>Your buyer account is verified and protected.</p>
              </div>
            </div>

            <button>
              <Lock size={16} />
              Security Settings
            </button>
          </div>
        </aside>

        <main className="profile-main">
          <div className="profile-actions">
            <button className="edit-btn">
              <Pencil size={18} />
              Edit Profile
            </button>

            <button className="save-btn">
              <Save size={18} />
              Save Changes
            </button>
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
                  <input type="text" value={profile.full_name || ""} readOnly />
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
                  <input type="text" value={profile.phone || ""} readOnly />
                </div>
              </div>

              <div className="form-group">
                <label>Location</label>

                <div className="input-wrapper">
                  <MapPin size={18} />
                  <input type="text" value={profile.location || ""} readOnly />
                </div>
              </div>

              <div className="form-group full-width">
                <label>Account Role</label>

                <div className="input-wrapper">
                  <ShieldCheck size={18} />
                  <input type="text" value="Verified Buyer Account" readOnly />
                </div>
              </div>

              <div className="form-group full-width">
                <label>About Buyer</label>

                <textarea
                  rows="6"
                  readOnly
                  value="Verified livestock buyer participating in digital livestock trading through HerdMarket. This account can browse marketplace listings, send inquiries, and monitor transaction progress."
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