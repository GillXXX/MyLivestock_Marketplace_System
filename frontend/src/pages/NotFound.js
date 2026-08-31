import { Link } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";
import "./NotFound.css";

function NotFound() {
  return (
    <div className="not-found-page">
      <div className="not-found-card">
        <span className="not-found-code">404</span>
        <h1>Page not found</h1>
        <p>
          The page you're looking for doesn't exist or may have been moved.
        </p>

        <div className="not-found-actions">
          <button type="button" onClick={() => window.history.back()}>
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
