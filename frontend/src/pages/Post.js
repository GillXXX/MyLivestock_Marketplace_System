import { useState } from "react";

import {
  ImagePlus,
  MapPin,
  BadgeDollarSign,
  Weight,
  HeartPulse,
  Calendar,
  Tag,
  FileText,
  ArrowLeft,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import "./Post.css";

function Post() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);

  const [formData, setFormData] = useState({
    livestockType: "",
    breed: "",
    age: "",
    weight: "",
    price: "",
    healthStatus: "",
    location: "",
    description: "",
    imageUrl: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const handlePost = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch("http://localhost:5000/api/listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Failed to create listing");
        setLoading(false);
        return;
      }

      alert("Listing published successfully!");
      navigate("/listings");
    } catch (error) {
      setMessage("Cannot connect to backend server");
    }

    setLoading(false);
  };

  return (
    <div className="premium-post-page">
      <div className="premium-post-header">
        <div className="header-left">
          <Link to="/listings" className="back-btn">
            <ArrowLeft size={20} />
          </Link>

          <div>
            <span className="page-tag">LIVESTOCK MARKETPLACE</span>
            <h1>Create New Listing</h1>
            <p>
              Publish your livestock professionally and reach more verified buyers across the marketplace.
            </p>
          </div>
        </div>
      </div>

      <div className="premium-post-card">
        {message && (
          <p style={{ color: "red", marginBottom: "15px" }}>
            {message}
          </p>
        )}

        <form onSubmit={handlePost}>
          <div className="premium-upload-box">
            <div className="upload-icon">
              <UploadCloud size={44} />
            </div>

            <h3>Upload Livestock Images</h3>

            <p>Click Choose Files to select livestock photos from your computer.</p>

            <label
              className="upload-btn"
              htmlFor="livestockImages"
              style={{
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                position: "relative",
                zIndex: 10,
              }}
            >
              <ImagePlus size={18} />
              Choose Files
            </label>

            <input
              id="livestockImages"
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              style={{
                opacity: 0,
                position: "absolute",
                width: "1px",
                height: "1px",
                pointerEvents: "none",
              }}
            />

            {selectedFiles.length > 0 && (
              <div style={{ marginTop: "15px" }}>
                <strong>Selected files:</strong>

                {selectedFiles.map((file, index) => (
                  <p key={index} style={{ margin: "5px 0" }}>
                    {file.name}
                  </p>
                ))}
              </div>
            )}

            <input
              name="imageUrl"
              type="text"
              placeholder="Optional: Paste image URL here"
              value={formData.imageUrl}
              onChange={handleChange}
              style={{ marginTop: "15px" }}
            />
          </div>

          <div className="section-title">
            <ShieldCheck size={18} />
            Livestock Information
          </div>

          <div className="premium-form-grid">
            <div className="form-group">
              <label>Livestock Type</label>

              <div className="input-wrapper">
                <Tag size={18} />

                <select
                  name="livestockType"
                  value={formData.livestockType}
                  onChange={handleChange}
                  required
                >
                  <option value="">Choose livestock type</option>
                  <option value="Swine">Swine</option>
                  <option value="Cattle">Cattle</option>
                  <option value="Goat">Goat</option>
                  <option value="Poultry">Poultry</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Breed</label>

              <div className="input-wrapper">
                <Tag size={18} />

                <input
                  name="breed"
                  type="text"
                  placeholder="Enter livestock breed"
                  value={formData.breed}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Age</label>

              <div className="input-wrapper">
                <Calendar size={18} />

                <input
                  name="age"
                  type="text"
                  placeholder="Example: 8 months"
                  value={formData.age}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Weight</label>

              <div className="input-wrapper">
                <Weight size={18} />

                <input
                  name="weight"
                  type="text"
                  placeholder="Example: 120 kg"
                  value={formData.weight}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Price</label>

              <div className="input-wrapper">
                <BadgeDollarSign size={18} />

                <input
                  name="price"
                  type="number"
                  placeholder="Enter selling price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Health Status</label>

              <div className="input-wrapper">
                <HeartPulse size={18} />

                <input
                  name="healthStatus"
                  type="text"
                  placeholder="Healthy / Vaccinated"
                  value={formData.healthStatus}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-group full-width">
            <label>Farm Location</label>

            <div className="input-wrapper">
              <MapPin size={18} />

              <input
                name="location"
                type="text"
                placeholder="Veruela, Agusan del Sur"
                value={formData.location}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group full-width">
            <label>Description</label>

            <div className="textarea-wrapper">
              <FileText size={18} />

              <textarea
                name="description"
                rows="6"
                placeholder="Provide complete livestock details, feeding history, vaccination records, and additional information..."
                value={formData.description}
                onChange={handleChange}
              ></textarea>
            </div>
          </div>

          <div className="post-actions">
            <button type="button" className="draft-btn">
              Save Draft
            </button>

            <button className="publish-btn" type="submit" disabled={loading}>
              {loading ? "Publishing..." : "Publish Listing"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Post;