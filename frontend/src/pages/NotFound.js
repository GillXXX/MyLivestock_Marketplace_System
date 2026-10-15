import { Link } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";
import useGoBack from "../utils/useGoBack";
import "./NotFound.css";

const DASHBOARD_BY_ROLE = {
  admin: "/admin-dashboard",
  mao_staff: "/admin-dashboard",
  farmer: "/farmer-dashboard",
  buyer: "/buyer-dashboard",
};

function NotFound() {
  // Opened in a new tab (e.g. a broken link) there's no page to go back
  // to, so "Go Back" lands on the signed-in user's dashboard instead.
  const role = JSON.parse(localStorage.getItem("user") || "{}").role;
  const goBack = useGoBack(DASHBOARD_BY_ROLE[role] || "/");

  return (
    <div className="not-found-page">
      <div className="not-found-card">
        <span className="not-found-code">404</span>
        <h1>Page not found</h1>
        <p>
          The page you're looking for doesn't exist or may have been moved.
        </p>

        <div className="not-found-actions">
          <button type="button" onClick={goBack}>
            <ArrowLeft size={18} />
            Go Back
          </button>

          <Link to="/">
            <Home size={18} />
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
