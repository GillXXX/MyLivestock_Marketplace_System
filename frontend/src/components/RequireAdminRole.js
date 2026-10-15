import { Navigate } from "react-router-dom";

function RequireAdminRole({ children }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (user.role !== "admin") {
    return <Navigate to="/admin-dashboard" replace />;
  }

  return children;
}

export default RequireAdminRole;
