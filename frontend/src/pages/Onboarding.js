import { useEffect, useState } from "react";
import { Tractor, ShoppingBag, ArrowRight } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { API_URL } from "../config";
import logo from "../assets/logo.png";
import "./Onboarding.css";

function Onboarding() {
  const navigate = useNavigate();

  const [role, setRole] = useState("buyer");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser) {
      navigate("/login");
      return;
    }

    const user = JSON.parse(storedUser);

    if (user.profileCompleted) {
      navigate("/");
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`${API_URL}/api/auth/complete-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Could not complete your profile");
        setLoading(false);
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user));

      if (data.user.role === "farmer") {
        navigate("/farmer-dashboard");
      } else {
        navigate("/buyer-dashboard");
      }
    } catch (error) {
      setMessage("Cannot connect to backend server");
      setLoading(false);
    }
  };

  return (
    <div className="modern-onboarding">
      <div className="onboarding-card">
        <Link to="/" aria-label="Back to VOLT home" className="onboarding-logo-link">
          <img src={logo} alt="VOLT logo" className="onboarding-logo" />
        </Link>

        <div className="onboarding-header">
          <span>ALMOST THERE</span>
          <h2>One last thing</h2>
          <p>Are you here to sell livestock, or to buy?</p>
        </div>

        {message && <p className="onboarding-error">{message}</p>}

        <form onSubmit={handleSubmit}>
          <div className="onboarding-role-grid">
            <button
              type="button"
              className={role === "buyer" ? "onboarding-role active" : "onboarding-role"}
              onClick={() => setRole("buyer")}
            >
              <ShoppingBag size={24} />
              <div>
                <strong>Buyer</strong>
                <p>Browse livestock and send inquiries</p>
              </div>
            </button>

            <button
              type="button"
              className={role === "farmer" ? "onboarding-role active" : "onboarding-role"}
              onClick={() => setRole("farmer")}
            >
              <Tractor size={24} />
              <div>
                <strong>Farmer</strong>
                <p>Post and manage livestock listings</p>
              </div>
            </button>
          </div>

          <button className="onboarding-btn" type="submit" disabled={loading}>
            {loading ? "Saving..." : "Continue"}
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default Onboarding;
