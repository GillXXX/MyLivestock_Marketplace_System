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
} from "lucide-react";

import { Link } from "react-router-dom";

import "./Profile.css";

function Profile() {

  return (
    <div className="premium-profile-page">

      {/* HEADER */}
      <div className="profile-page-header">

        <div className="header-left">

          <Link
            to="/farmer-dashboard"
            className="back-btn"
          >
            <ArrowLeft size={20} />
          </Link>

          <div>

            <span className="page-tag">
              ACCOUNT MANAGEMENT
            </span>

            <h1>Farmer Profile</h1>

            <p>
              Manage your farmer account, livestock marketplace identity, and profile settings professionally.
            </p>

          </div>

        </div>

      </div>

      {/* PROFILE GRID */}
      <div className="profile-layout">

        {/* LEFT PANEL */}
        <aside className="profile-sidebar">

          {/* COVER */}
          <div className="profile-cover"></div>

          {/* PROFILE */}
          <div className="profile-user">

            <div className="profile-image-wrapper">

              <img
                src="https://i.pravatar.cc/300"
                alt="profile"
              />

              <button className="camera-btn">
                <Camera size={16} />
              </button>

            </div>

            <div className="profile-user-info">

              <h2>
                Almyr Belenson
              </h2>

              <div className="verified-row">

                <span className="verified-badge">
                  <BadgeCheck size={15} />
                  Verified Farmer
                </span>

              </div>

              <p>
                Backyard livestock farmer specializing in swine and goat raising in Veruela, Agusan del Sur.
              </p>

            </div>

          </div>

          {/* STATS */}
          <div className="profile-stats">

            <div className="stat-box">

              <TrendingUp size={20} />

              <div>
                <h3>12</h3>
                <span>Active Listings</span>
              </div>

            </div>

            <div className="stat-box">

              <Wallet size={20} />

              <div>
                <h3>₱245K</h3>
                <span>Total Sales</span>
              </div>

            </div>

            <div className="stat-box">

              <Calendar size={20} />

              <div>
                <h3>2026</h3>
                <span>Joined Marketplace</span>
              </div>

            </div>

          </div>

          {/* ACCOUNT STATUS */}
          <div className="account-status-card">

            <div className="status-top">

              <ShieldCheck size={22} />

              <div>

                <h4>
                  Account Security
                </h4>

                <p>
                  Your account is fully verified and protected.
                </p>

              </div>

            </div>

            <button>
              <Lock size={16} />
              Security Settings
            </button>

          </div>

        </aside>

        {/* RIGHT PANEL */}
        <main className="profile-main">

          {/* TOP ACTIONS */}
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

          {/* FORM CARD */}
          <div className="profile-form-card">

            <div className="section-title">

              <User2 size={18} />

              <h3>
                Personal Information
              </h3>

            </div>

            <div className="profile-form-grid">

              {/* FULL NAME */}
              <div className="form-group">

                <label>
                  Full Name
                </label>

                <div className="input-wrapper">

                  <User2 size={18} />

                  <input
                    type="text"
                    value="Almyr Belenson"
                    readOnly
                  />

                </div>

              </div>

              {/* EMAIL */}
              <div className="form-group">

                <label>
                  Email Address
                </label>

                <div className="input-wrapper">

                  <Mail size={18} />

                  <input
                    type="email"
                    value="almyr@email.com"
                    readOnly
                  />

                </div>

              </div>

              {/* PHONE */}
              <div className="form-group">

                <label>
                  Phone Number
                </label>

                <div className="input-wrapper">

                  <Phone size={18} />

                  <input
                    type="text"
                    value="+63 9123456789"
                    readOnly
                  />

                </div>

              </div>

              {/* LOCATION */}
              <div className="form-group">

                <label>
                  Farm Location
                </label>

                <div className="input-wrapper">

                  <MapPin size={18} />

                  <input
                    type="text"
                    value="Veruela, Agusan del Sur"
                    readOnly
                  />

                </div>

              </div>

              {/* ROLE */}
              <div className="form-group full-width">

                <label>
                  Account Role
                </label>

                <div className="input-wrapper">

                  <ShieldCheck size={18} />

                  <input
                    type="text"
                    value="Verified Farmer Account"
                    readOnly
                  />

                </div>

              </div>

              {/* ABOUT */}
              <div className="form-group full-width">

                <label>
                  About Farmer
                </label>

                <textarea
                  rows="6"
                  readOnly
                  value="Experienced backyard livestock farmer focused on sustainable swine and goat production. Actively participating in digital livestock trading within Veruela and nearby municipalities."
                ></textarea>

              </div>

            </div>

          </div>

        </main>

      </div>

    </div>
  );
}

export default Profile;