import { API_URL } from "../config";

// Persists a login/verify-code/Google response and routes the user onward.
// Shared by Login and Register so both land in the same place. A brand-new
// account (Google or email code, no upfront form) is flagged incomplete —
// it's sent to onboarding to pick a role and fill in name/phone before it
// can reach a dashboard. Returns false if the role wasn't recognized
// (nothing to navigate to), so the caller can show a message.
export const completeAuth = (data, navigate) => {
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));

  if (!data.user.profileCompleted) {
    navigate("/onboarding");
    return true;
  }

  if (data.user.role === "admin" || data.user.role === "mao_staff") {
    navigate("/admin-dashboard");
  } else if (data.user.role === "farmer") {
    navigate("/farmer-dashboard");
  } else if (data.user.role === "buyer") {
    navigate("/buyer-dashboard");
  } else {
    return false;
  }

  return true;
};

// Signs out: tells the server first (for admin and MAO staff that records
// the sign-out time and ends the session, so the token stops working), then
// clears this browser's login.
export const logout = (navigate) => {
  const token = localStorage.getItem("token");

  if (token) {
    fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      keepalive: true,
    }).catch(() => {});
  }

  localStorage.removeItem("token");
  localStorage.removeItem("user");
  navigate("/login");
};

// Turns what Google's popup reports back into something a person can act
// on, instead of one generic "failed" for every cause. Covers both OAuth
// errors (onError) and popup problems (onNonOAuthError). Returns "" when
// the person simply closed the popup themselves.
export const describeGoogleError = (error) => {
  const type = error?.type || error?.error;

  if (type === "popup_closed") return "";
  if (type === "popup_failed_to_open") {
    return "The Google sign-in window was blocked. Please allow pop-ups for this site and try again.";
  }
  if (type === "access_denied") return "Google sign-in was cancelled.";

  const detail = error?.error_description || type;
  return detail ? `Google sign-in failed (${detail}).` : "Google sign-in failed.";
};

// Where each role lands after signing in, and where a page sends someone
// whose role it isn't for.
const DASHBOARD_BY_ROLE = {
  admin: "/admin-dashboard",
  mao_staff: "/admin-dashboard",
  farmer: "/farmer-dashboard",
  buyer: "/buyer-dashboard",
};

export const dashboardFor = (role) => DASHBOARD_BY_ROLE[role] || "/";
