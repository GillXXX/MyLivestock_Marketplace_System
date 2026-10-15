import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { API_URL } from './config';
import { installRequestTimeout } from './utils/requestTimeout';
import { installSessionGuard } from './utils/sessionGuard';

// Gives up on API requests that hang (utils/requestTimeout.js) and sends
// people to Login when their session expires (utils/sessionGuard.js).
installRequestTimeout();
installSessionGuard();

// Uploaded files are saved with the full server address of the time they
// were uploaded (e.g. an old Wi-Fi IP like http://10.254.50.74:5000). From
// another network — or from the https:// page, where http images are
// blocked — that address can't load, and the browser may take a long time
// to give up on it. So point every /uploads/ image or video at the current
// API server *before* it loads, instead of waiting for the failure below.
const UPLOADS_BASE = `${API_URL || window.location.origin}/uploads/`;
const UPLOAD_PATH = /^https?:\/\/[^/]+\/uploads\/(.+)$/;

const pointAtCurrentServer = (el) => {
  if (!(el instanceof HTMLImageElement || el instanceof HTMLVideoElement)) return;
  const src = el.getAttribute('src');
  const match = src && src.match(UPLOAD_PATH);
  if (!match) return;
  const current = `${UPLOADS_BASE}${match[1]}`;
  if (src !== current) el.setAttribute('src', current);
};

new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes') {
      pointAtCurrentServer(mutation.target);
      return;
    }
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType !== 1) return;
      pointAtCurrentServer(node);
      node.querySelectorAll?.('img, video').forEach(pointAtCurrentServer);
    });
  });
}).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['src'],
});

// Safety net: if an uploaded image still fails to load, retry it once
// against the current API server.
document.addEventListener(
  'error',
  (event) => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || img.dataset.uploadRetried) return;

    const match = img.src.match(/^https?:\/\/[^/]+(\/uploads\/.+)$/);
    if (!match) return;

    const retryUrl = `${API_URL}${match[1]}`;
    if (retryUrl === img.src) return;

    img.dataset.uploadRetried = 'true';
    img.src = retryUrl;
  },
  true
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
