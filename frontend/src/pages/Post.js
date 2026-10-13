import { useEffect, useState } from "react";

import {
  ImagePlus,
  MapPin,
  PhilippinePeso,
  Weight,
  HeartPulse,
  Calendar,
  Tag,
  FileText,
  ArrowLeft,
  ShieldCheck,
  UploadCloud,
  AlertTriangle,
  Hash,
  X,
} from "lucide-react";

import { Link, useNavigate, useParams } from "react-router-dom";
import { getDocumentRequirement, formatRequirementMessage } from "../utils/livestockDocRequirements";
import {
  LIVESTOCK_TYPES,
  FARM_PRODUCT_TYPES,
  ALL_KNOWN_TYPES,
  OTHER_LIVESTOCK,
  OTHER_PRODUCT,
  UNITS,
  defaultUnitFor,
  getCategory,
} from "../utils/productCatalog";
import { API_URL } from "../config";
import useGoBack from "../utils/useGoBack";
import "./Post.css";

function Post() {
  const navigate = useNavigate();
  const goBack = useGoBack("/listings");
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
  // System Settings > "Require document verification" (sent with the
  // farmer profile); when off, supporting documents are optional.
  const [documentsRequired, setDocumentsRequired] = useState(true);

  // typeChoice is the dropdown value: a known type, or one of the two
  // "Other" options, in which case the farmer types the name in customType.
  const [typeChoice, setTypeChoice] = useState("");
  const [customType, setCustomType] = useState("");

  const [formData, setFormData] = useState({
    unit: "head",
    breed: "",
    age: "",
    weight: "",
    price: "",
    quantity: "",
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

        const savedType = data.livestock_type || "";
        if (ALL_KNOWN_TYPES.includes(savedType)) {
          setTypeChoice(savedType);
        } else if (savedType) {
          setTypeChoice(data.category === "product" ? OTHER_PRODUCT : OTHER_LIVESTOCK);
          setCustomType(savedType);
        }

        setFormData({
          unit: data.unit || "head",
          breed: data.breed || "",
          age: data.age || "",
          weight: data.weight || "",
          price: data.price || "",
          quantity: data.quantity || "",
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
          setDocumentsRequired(data.documentsRequired !== false);
        }
      } catch (error) {
        // If this check fails, let the actual submit attempt surface the error.
      }
    };

    checkVerification();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode]);

  const [imagePreviewUrl, setImagePreviewUrl] = useState("");

  useEffect(() => {
    if (!selectedImage) {
      setImagePreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(selectedImage);
    setImagePreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [selectedImage]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const isOtherChoice = typeChoice === OTHER_LIVESTOCK || typeChoice === OTHER_PRODUCT;
  const productType = isOtherChoice ? customType.trim() : typeChoice;
  const category =
    typeChoice === OTHER_PRODUCT ? "product" : getCategory(typeChoice, "livestock");
  const isProduct = category === "product";
  const unitInfo = UNITS.find((u) => u.value === formData.unit) || UNITS[0];

  const handleTypeChange = (e) => {
    const choice = e.target.value;
    setTypeChoice(choice);

    const nextCategory = choice === OTHER_PRODUCT ? "product" : getCategory(choice, "livestock");
    setFormData((prev) => ({ ...prev, unit: defaultUnitFor(choice, nextCategory) }));
  };

  const handleImageChange = (e) => {
    setSelectedImage(e.target.files[0] || null);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setExistingImageUrl("");
  };

  const handleDocumentsChange = (e) => {
    setSelectedDocuments(Array.from(e.target.files));
  };

  const handleRemoveSelectedDocument = (index) => {
    setSelectedDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePost = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!productType) {
      setMessage("Please enter what you're selling.");
      return;
    }

    const requirement = getDocumentRequirement(productType, category);
    const documentCount = selectedDocuments.length || existingDocuments.length;

    if (documentsRequired && requirement && documentCount < requirement.minDocuments) {
      setMessage(formatRequirementMessage(productType, category));
      return;
    }

    setLoading(true);

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
      payload.append("livestockType", productType);
      payload.append("category", category);

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

      alert(data.message || (isEditMode ? "Listing updated successfully!" : "Listing published successfully!"));
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
          <button type="button" className="back-btn" onClick={goBack} aria-label="Go back">
            <ArrowLeft size={20} />
          </button>

          <div>
            <span className="page-tag">FARM MARKETPLACE</span>
            <h1>{isEditMode ? "Edit Listing" : "Create New Listing"}</h1>
            <p>
              {isEditMode
                ? "Update your listing details, photo, or documents."
                : "Post livestock or backyard farm products like eggs, fruits, and vegetables to reach verified buyers."}
            </p>
          </div>
        </div>
      </div>

      <div className="premium-post-card">
        {!isEditMode && !isVerified && (
          <div className="form-alert warning">
            <AlertTriangle size={18} />
            <p>
              Your account isn't verified yet, so you can't post a listing. Submit your
              government ID and barangay certificate on your{" "}
              <Link to="/profile">Profile page</Link> to get verified.
            </p>
          </div>
        )}

        {message && (
          <div className="form-alert error">
            <AlertTriangle size={18} />
            <p>{message}</p>
          </div>
        )}

        <form onSubmit={handlePost}>
          <div className="premium-upload-box">
            {imagePreviewUrl || existingImageUrl ? (
              <div className="upload-preview">
                <img src={imagePreviewUrl || existingImageUrl} alt="Product" />
                <button
                  type="button"
                  className="upload-preview-remove"
                  onClick={handleRemoveImage}
                  title="Remove photo"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="upload-icon">
                  <UploadCloud size={26} />
                </div>

                <h3>Upload Product Photo</h3>

                <p>Click Choose Photo to select a photo of what you're selling.</p>
              </>
            )}

            <label className="upload-btn" htmlFor="livestockImage">
              <ImagePlus size={18} />
              {imagePreviewUrl || existingImageUrl ? "Change Photo" : "Choose Photo"}
            </label>

            <input
              id="livestockImage"
              className="visually-hidden"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />

            <input
              name="imageUrl"
              className="upload-url-fallback"
              type="text"
              placeholder="Or paste an image URL instead"
              value={formData.imageUrl}
              onChange={handleChange}
              disabled={!!selectedImage}
            />
          </div>

          <div className="premium-upload-box">
            <div className="upload-icon">
              <FileText size={26} />
            </div>

            {isProduct ? (
              <>
                <h3>
                  Supporting Documents <span className="optional-mark">(Optional)</span>
                </h3>

                <p>Farm products don't need a health certificate, but you can attach any permit or certificate you have.</p>
              </>
            ) : (
              <>
                <h3>Upload Barangay Health Certificate</h3>

                <p>Attach your barangay health certificate for this animal for MAO verification.</p>

                {productType && (
                  <p className="doc-requirement-hint">
                    {documentsRequired
                      ? formatRequirementMessage(productType, category)
                      : "Optional — MAO currently doesn't require documents for listings."}
                  </p>
                )}
              </>
            )}

            <label className="upload-btn" htmlFor="livestockDocuments">
              <FileText size={18} />
              Choose Documents
            </label>

            <input
              id="livestockDocuments"
              className="visually-hidden"
              type="file"
              accept="image/*,application/pdf"
              onChange={handleDocumentsChange}
            />

            {selectedDocuments.length > 0 ? (
              <div className="doc-chip-list">
                <span className="doc-chip-label">Selected (will replace existing):</span>

                {selectedDocuments.map((file, index) => (
                  <span className="doc-chip" key={index}>
                    <FileText size={14} />
                    <span className="doc-chip-name">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSelectedDocument(index)}
                      title="Remove"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            ) : existingDocuments.length > 0 ? (
              <div className="doc-chip-list">
                <span className="doc-chip-label">Current documents:</span>

                {existingDocuments.map((docUrl, index) => (
                  <a
                    className="doc-chip"
                    href={docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    key={index}
                  >
                    <FileText size={14} />
                    <span className="doc-chip-name">Document {index + 1}</span>
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          <div className="section-title">
            <div className="section-title-icon">
              <ShieldCheck size={16} />
            </div>
            <div>
              <h4>{isProduct ? "Product Information" : "Livestock Information"}</h4>
              <p>Accurate details help MAO verify your listing faster.</p>
            </div>
          </div>

          <div className="premium-form-grid">
            <div className="form-group">
              <label>What are you selling?</label>

              <div className="input-wrapper">
                <Tag size={18} />

                <select value={typeChoice} onChange={handleTypeChange} required>
                  <option value="">Choose a product type</option>
                  <optgroup label="Livestock">
                    {LIVESTOCK_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Farm Products">
                    {FARM_PRODUCT_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Other">
                    <option value={OTHER_LIVESTOCK}>Other animal (type your own)</option>
                    <option value={OTHER_PRODUCT}>Other farm product (type your own)</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {isOtherChoice && (
              <div className="form-group">
                <label>{typeChoice === OTHER_PRODUCT ? "Product Name" : "Animal Type"}</label>

                <div className="input-wrapper">
                  <Tag size={18} />

                  <input
                    type="text"
                    maxLength={50}
                    placeholder={
                      typeChoice === OTHER_PRODUCT
                        ? "Example: Mushrooms, Rice, Peanuts"
                        : "Example: Rabbit, Turkey, Sheep"
                    }
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>
                {isProduct ? "Variety" : "Breed"}
                {isProduct && <span className="optional-mark"> (Optional)</span>}
              </label>

              <div className="input-wrapper">
                <Tag size={18} />

                <input
                  name="breed"
                  type="text"
                  placeholder={isProduct ? "Example: Native, Lakatan, Carabao mango" : "Enter livestock breed"}
                  value={formData.breed}
                  onChange={handleChange}
                  required={!isProduct}
                />
              </div>
            </div>

            {!isProduct && (
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
            )}

            <div className="form-group">
              <label>
                {isProduct ? "Size / Weight" : "Weight"}
                {isProduct && <span className="optional-mark"> (Optional)</span>}
              </label>

              <div className="input-wrapper">
                <Weight size={18} />

                <input
                  name="weight"
                  type="text"
                  placeholder={isProduct ? "Example: Large, 60g per egg" : "Example: 120 kg"}
                  value={formData.weight}
                  onChange={handleChange}
                  required={!isProduct}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Price {unitInfo.label}</label>

              <div className="input-wrapper">
                <PhilippinePeso size={18} />

                <input
                  name="price"
                  type="number"
                  placeholder={`Price ${unitInfo.label}`}
                  value={formData.price}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Selling Unit</label>

              <div className="input-wrapper">
                <Hash size={18} />

                <select name="unit" value={formData.unit} onChange={handleChange} required>
                  {UNITS.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Quantity Available</label>

              <div className="input-wrapper">
                <Hash size={18} />

                <input
                  name="quantity"
                  type="number"
                  min="1"
                  step="1"
                  placeholder={`Number of ${unitInfo.plural} available`}
                  value={formData.quantity}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>
                {isProduct ? "Condition" : "Health Status"}
                {isProduct && <span className="optional-mark"> (Optional)</span>}
              </label>

              <div className="input-wrapper">
                <HeartPulse size={18} />

                <input
                  name="healthStatus"
                  type="text"
                  placeholder={isProduct ? "Fresh / Organic / Newly harvested" : "Healthy / Vaccinated"}
                  value={formData.healthStatus}
                  onChange={handleChange}
                  required={!isProduct}
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
            <label>
              Description <span className="optional-mark">(Optional)</span>
            </label>

            <div className="textarea-wrapper">
              <FileText size={18} />

              <textarea
                name="description"
                rows="6"
                placeholder={
                  isProduct
                    ? "Describe your product: how it was grown or raised, harvest date, pickup or delivery options..."
                    : "Provide complete livestock details, feeding history, vaccination records, and additional information..."
                }
                value={formData.description}
                onChange={handleChange}
              ></textarea>
            </div>
          </div>

          <div className="post-actions">
            <button
              className="post-submit-btn"
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