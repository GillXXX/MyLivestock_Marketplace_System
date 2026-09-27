// Set but empty (REACT_APP_API_URL=) means "same origin": requests go to
// /api/... on the page's own host and the dev server's proxy forwards them
// to the backend — needed for the local HTTPS setup. Unset falls back to
// the local backend.
const envApiUrl = process.env.REACT_APP_API_URL;
export const API_URL = envApiUrl !== undefined ? envApiUrl : "http://localhost:5000";

// Local, dependency-free fallback avatar (a hotlinked Unsplash photo used to
// serve as this default and started returning 503s — a bundled data URI
// never depends on a third party staying up).
const DEFAULT_AVATAR_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
    <rect width="200" height="200" fill="#0f3d2e"/>
    <circle cx="100" cy="80" r="36" fill="#f4f1e8"/>
    <path d="M30 180 Q100 115 170 180 Z" fill="#f4f1e8"/>
  </svg>
`;

export const DEFAULT_AVATAR = `data:image/svg+xml,${encodeURIComponent(DEFAULT_AVATAR_SVG)}`;

// Bundled with the app so listings without a photo never depend on a
// third-party host being reachable.
export { default as DEFAULT_LISTING_IMAGE } from "./assets/livestock/cattle.jpg";
