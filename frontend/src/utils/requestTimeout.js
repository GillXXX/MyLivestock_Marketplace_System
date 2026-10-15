// Gives up on API requests that take too long, so a slow or dropped
// connection (common on rural mobile data) ends in the page's error
// message instead of "Loading..." or "Saving..." forever. Uploads get much
// longer, since a photo or video can take minutes on a weak signal.
// Installed once, from index.js. A request that brings its own `signal`
// is left alone.

const API_TIMEOUT_MS = 30 * 1000;
const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;

export function installRequestTimeout() {
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input, init = {}) => {
    const url = typeof input === "string" ? input : input?.url || "";

    if (!url.includes("/api/") || init.signal || (typeof input === "object" && input.signal)) {
      return originalFetch(input, init);
    }

    const controller = new AbortController();
    const timeoutMs = init.body instanceof FormData ? UPLOAD_TIMEOUT_MS : API_TIMEOUT_MS;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    return originalFetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
  };
}
