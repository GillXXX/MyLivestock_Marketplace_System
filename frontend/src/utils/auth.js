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
