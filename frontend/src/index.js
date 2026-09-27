import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { API_URL } from './config';

// Uploaded-file URLs cached in the browser (e.g. a saved profile) can still
// carry an old server address. If an uploaded image fails to load, retry it
// once against the current API server.
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
