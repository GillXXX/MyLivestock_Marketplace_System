// Shared by every endpoint that sets a password (registration, reset,
// change-password, admin-created staff) so the bar for "secure enough"
// stays the same everywhere instead of drifting per form. Requires at
// least 8 characters with a mix of upper/lowercase letters and a number —
// blocks things like "password" or "12345678" without demanding special
// characters, which tends to just push people toward "Password1!".
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const PASSWORD_REQUIREMENTS_MESSAGE =
  "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number";

const isStrongPassword = (password) => PASSWORD_RE.test(password);

module.exports = { isStrongPassword, PASSWORD_REQUIREMENTS_MESSAGE };
