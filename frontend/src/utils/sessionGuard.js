// Watches every API response. When the server says the signed-in session
// is no longer valid — the 7-day token expired, a staff member was signed
// out elsewhere, or the account was deleted or deactivated — this clears
// the stored login and sends the person to the Login page with a message,
// instead of leaving them on a page that only shows "Invalid token" or
// empty data. Installed once, from index.js.

// Login, sign-up and sign-out answer 401/403 for their own reasons (wrong
// password, already signed out); those are handled by their own pages.
const IGNORED_PATHS = ["/api/auth/"];

let redirecting = false;

const endSession = (reason) => {
  if (redirecting) return;
  redirecting = true;

  localStorage.removeItem("token");
  localStorage.removeItem("user");

  if (window.location.pathname !== "/login") {
    window.location.assign(`/login?session=${reason}`);
  } else {
    redirecting = false;
  }
};

const requestInfo = (input, init) => {
  const url = typeof input === "string" ? input : input?.url || "";
  const headers = new Headers(init?.headers || (typeof input === "object" ? input.headers : undefined));
  return { url, hadToken: (headers.get("Authorization") || "").startsWith("Bearer ") };
};

export function installSessionGuard() {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const response = await originalFetch(input, init);
    const { url, hadToken } = requestInfo(input, init);

    if (!hadToken || !url.includes("/api/") || IGNORED_PATHS.some((path) => url.includes(path))) {
      return response;
    }

    if (response.status === 401) {
      endSession("expired");
    } else if (response.status === 403) {
      // 403 also means "your role can't do this", which is not a reason to
      // sign out — only a deactivated account is.
      const body = await response
        .clone()
        .json()
        .catch(() => null);
      if (body?.code === "ACCOUNT_DEACTIVATED") endSession("deactivated");
    }

    return response;
  };
}

// Shown on the Login page after a redirect from endSession.
export const SESSION_MESSAGES = {
  expired: "Your session has expired. Please sign in again.",
  deactivated: "Your account has been deactivated. Contact the MAO administrator.",
};
