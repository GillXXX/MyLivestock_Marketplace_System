import { useEffect, useState } from "react";

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

import { Link, useNavigate, useParams } from "react-router-dom";
import { API_URL } from "../config";
import "./Post.css";

function Post() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [loadingListing, setLoadingListing] = useState(isEditMode);
  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [existingImageUrl, setExistingImageUrl] = useState("");
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [isVerified, setIsVerified] = useState(true);

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

  useEffect(() => {
    if (!isEditMode) return;

    const fetchListing = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const res = await fetch(`${API_URL}/api/listings/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (!res.ok) {
          setMessage(data.message || "Failed to load listing");
          setLoadingListing(false);
          return;
        }

        setFormData({
          livestockType: data.livestock_type || "",
          breed: data.breed || "",
          age: data.age || "",
          weight: data.weight || "",
          price: data.price || "",
          healthStatus: data.health_status || "",
          location: data.location || "",
          description: data.description || "",
          imageUrl: "",
        });

        setExistingImageUrl(data.image_url || "");

        try {
          const docs = data.documents ? JSON.parse(data.documents) : [];
          setExistingDocuments(Array.isArray(docs) ? docs : []);
        } catch (error) {
          setExistingDocuments([]);
        }

        setLoadingListing(false);
      } catch (error) {
        setMessage("Cannot connect to backend server");
        setLoadingListing(false);
      }
    };

    fetchListing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (isEditMode) return;

    const checkVerification = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const res = await fetch(`${API_URL}/api/farmer/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (res.ok) {
          setIsVerified(Boolean(data.is_verified));
        }
      } catch (error) {
        // If this check fails, let the actual submit attempt surface the error.
      }
    };

    checkVerification();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageChange = (e) => {
    setSelectedImage(e.target.files[0] || null);
  };

  const handleDocumentsChange = (e) => {
    setSelectedDocuments(Array.from(e.target.files));
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

      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        payload.append(key, value);
      });

      if (selectedImage) {
        payload.append("image", selectedImage);
      }

      selectedDocuments.forEach((file) => {
        payload.append("documents", file);
      });

      const res = await fetch(
        isEditMode
          ? `${API_URL}/api/listings/${id}`
          : `${API_URL}/api/listings`,
        {
          method: isEditMode ? "PUT" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: payload,
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || (isEditMode ? "Failed to update listing" : "Failed to create listing"));
        setLoading(false);
        return;
      }

      alert(isEditMode ? "Listing updated successfully!" : "Listing published successfully!");
      navigate("/listings");
    } catch (error) {
      setMessage("Cannot connect to backend server");
    }

    setLoading(false);
  };

  if (loadingListing) {
    return <h2 style={{ padding: "30px" }}>Loading listing...</h2>;
  }

  return (
    <div className="premium-post-page">
      <div className="premium-post-header">
        <div className="header-left">
          <Link to="/listings" className="back-btn">
            <ArrowLeft size={20} />
          </Link>

          <div>
            <span className="page-tag">LIVESTOCK MARKETPLACE</span>
            <h1>{isEditMode ? "Edit Listing" : "Create New Listing"}</h1>
            <p>
              {isEditMode
                ? "Update your livestock listing details, photo, or documents."
                : "Publish your livestock professionally and reach more verified buyers across the marketplace."}
            </p>
          </div>
        </div>
      </div>

      <div className="premium-post-card">
        {!isEditMode && !isVerified && (
          <p style={{ color: "#946200", background: "#fff5d8", padding: "12px 16px", borderRadius: "12px", marginBottom: "15px" }}>
            Your account isn't verified yet, so you can't post a listing. Submit your
            government ID and barangay certificate on your{" "}
            <Link to="/profile">Profile page</Link> to get verified.
          </p>
        )}

        {message && (
          <p style={{ color: "red", marginBottom: "15px" }}>
            {message}
          </p>
        )}

        <form onSubmit={handlePost}>
          <div className="premium-upload-box">
            <div className="upload-icon">
              <UploadCloud size={26} />
            </div>

            <h3>Upload Livestock Photo</h3>

            <p>Click Choose Photo to select a livestock image from your computer.</p>

            <label
              className="upload-btn"
              htmlFor="livestockImage"
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
              Choose Photo
            </label>

            <input
              id="livestockImage"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{
                opacity: 0,
                position: "absolute",
                width: "1px",
                height: "1px",
                pointerEvents: "none",
              }}
            />

            {selectedImage ? (
              <div style={{ marginTop: "15px" }}>
                <strong>Selected photo:</strong>
                <p style={{ margin: "5px 0" }}>{selectedImage.name}</p>
              </div>
            ) : existingImageUrl ? (
              <div style={{ marginTop: "15px" }}>
                <strong>Current photo:</strong>
                <p style={{ margin: "5px 0" }}>
                  <img
                    src={existingImageUrl}
                    alt="Current listing"
                    style={{ maxWidth: "160px", borderRadius: "12px", marginTop: "8px" }}
                  />
                </p>
              </div>
            ) : null}

            <input
              name="imageUrl"
              type="text"
              placeholder="Or paste an image URL instead"
              value={formData.imageUrl}
              onChange={handleChange}
              disabled={!!selectedImage}
              style={{ marginTop: "15px" }}
            />
          </div>

          <div className="premium-upload-box">
            <div className="upload-icon">
              <FileText size={26} />
            </div>

            <h3>Upload Supporting Documents</h3>

            <p>Attach health certificates, ownership documents, or other proof for MAO verification.</p>

            <label
              className="upload-btn"
              htmlFor="livestockDocuments"
              style={{
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                position: "relative",
                zIndex: 10,
              }}
            >
              <FileText size={18} />
              Choose Documents
            </label>

            <input
              id="livestockDocuments"
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={handleDocumentsChange}
              style={{
                opacity: 0,
                position: "absolute",
                width: "1px",
                height: "1px",
                pointerEvents: "none",
              }}
            />

            {selectedDocuments.length > 0 ? (
              <div style={{ marginTop: "15px" }}>
                <strong>Selected documents (will replace existing):</strong>

                {selectedDocuments.map((file, index) => (
                  <p key={index} style={{ margin: "5px 0" }}>
                    {file.name}
                  </p>
                ))}
              </div>
            ) : existingDocuments.length > 0 ? (
              <div style={{ marginTop: "15px" }}>
                <strong>Current documents:</strong>

                {existingDocuments.map((docUrl, index) => (
                  <p key={index} style={{ margin: "5px 0" }}>
                    <a href={docUrl} target="_blank" rel="noopener noreferrer">
                      Document {index + 1}
                    </a>
                  </p>
                ))}
              </div>
            ) : null}
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
            <button
              className="publish-btn"
              type="submit"
              disabled={loading || (!isEditMode && !isVerified)}
            >
              {loading
                ? isEditMode
                  ? "Saving..."
                  : "Publishing..."
                : isEditMode
                ? "Save Changes"
                : "Publish Listing"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Post;