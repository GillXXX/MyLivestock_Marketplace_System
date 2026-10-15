const respond = (status, body = {}) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

const withToken = { headers: { Authorization: "Bearer abc" } };

let assign;
let serverFetch;

// A fresh copy of the module for each test, since it remembers whether it
// is already redirecting.
const install = () => {
  let guard;
  jest.isolateModules(() => {
    guard = require("./sessionGuard");
  });
  window.fetch = (...args) => serverFetch(...args);
  guard.installSessionGuard();
};

beforeEach(() => {
  localStorage.setItem("token", "abc");
  localStorage.setItem("user", JSON.stringify({ role: "farmer" }));
  assign = jest.fn();
  delete window.location;
  window.location = { pathname: "/farmer-dashboard", search: "", assign };
});

const signedOut = () => localStorage.getItem("token") === null && localStorage.getItem("user") === null;

test("an expired session (401) signs out and goes to Login", async () => {
  serverFetch = () => respond(401, { code: "SESSION_INVALID" });
  install();
  await window.fetch("/api/farmer/transactions", withToken);
  expect(signedOut()).toBe(true);
  expect(assign).toHaveBeenCalledWith("/login?session=expired");
});

test("a deactivated account (403 ACCOUNT_DEACTIVATED) signs out", async () => {
  serverFetch = () => respond(403, { code: "ACCOUNT_DEACTIVATED" });
  install();
  await window.fetch("/api/farmer/profile", withToken);
  expect(signedOut()).toBe(true);
  expect(assign).toHaveBeenCalledWith("/login?session=deactivated");
});

test("a plain permission error (403) does not sign out", async () => {
  serverFetch = () => respond(403, { message: "You do not have permission to perform this action." });
  install();
  const res = await window.fetch("/api/admin/users", withToken);
  expect(signedOut()).toBe(false);
  expect(assign).not.toHaveBeenCalled();
  expect((await res.json()).message).toMatch(/permission/);
});

test("a wrong password on Login (auth route) is left to the Login page", async () => {
  serverFetch = () => respond(401, { message: "Invalid email or password" });
  install();
  await window.fetch("/api/auth/login", { method: "POST" });
  await window.fetch("/api/auth/logout", { method: "POST", ...withToken });
  expect(signedOut()).toBe(false);
  expect(assign).not.toHaveBeenCalled();
});

test("requests without a token, and successful ones, are untouched", async () => {
  serverFetch = () => respond(401);
  install();
  await window.fetch("/api/public/stats");
  serverFetch = () => respond(200, { ok: true });
  const res = await window.fetch("/api/farmer/profile", withToken);
  expect(signedOut()).toBe(false);
  expect(await res.json()).toEqual({ ok: true });
});

test("several failing requests at once redirect only once", async () => {
  serverFetch = () => respond(401);
  install();
  await Promise.all([1, 2, 3].map(() => window.fetch("/api/messages/conversations", withToken)));
  expect(assign).toHaveBeenCalledTimes(1);
});
