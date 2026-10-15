// Development only (read by react-scripts' dev server).
// The "proxy" field in package.json skips any GET request whose Accept
// header includes text/html — which is every document opened in a new tab
// — and answers it with this app's index.html instead. So uploaded files
// (health certificates, and verification documents via their signed
// /private-files links) always go to the backend, however they're opened.
// Everything else still uses "proxy".
const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function setupProxy(app) {
  app.use(
    createProxyMiddleware(["/uploads", "/private-files"], {
      target: "http://127.0.0.1:5000",
      changeOrigin: true,
      xfwd: true,
      logLevel: "silent",
    })
  );
};
