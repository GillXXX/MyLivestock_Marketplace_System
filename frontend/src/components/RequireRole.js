import { Navigate, useLocation } from "react-router-dom";
import { dashboardFor } from "../utils/auth";

// Keeps each area of the app to the roles it's for: not signed in → Login;
// account not finished yet → Onboarding; signed in with another role → that
// person's own dashboard. The server enforces the same rules on every API
// call; this just stops people landing on pages that can only show errors.
function RequireRole({ roles, children }) {
  const location = useLocation();
  const token = localStorage.getItem("token");
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch (error) {
    user = null;
  }

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Older stored logins may not have the flag; treat those as complete.
  if (user.profileCompleted === false) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!roles.includes(user.role)) {
    return <Navigate to={dashboardFor(user.role)} replace />;
  }

  return children;
}

export default RequireRole;
