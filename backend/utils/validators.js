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

// Shared by the farmer and buyer profile saves. Only the fields actually
// sent are changed, so a request that leaves one out can't wipe it to
// NULL, and the name can never be saved blank. Returns { error } or the
// columns to update.
const pickProfileFields = (body, textFields, coordinateFields = []) => {
  const fields = {};

  if (body.full_name !== undefined) {
    const fullName = String(body.full_name).trim();
    if (!fullName) {
      return { error: "Full name is required" };
    }
    fields.full_name = fullName;
  }

  for (const key of textFields) {
    if (body[key] !== undefined) fields[key] = String(body[key]).trim();
  }

  for (const [key, limit] of coordinateFields) {
    if (body[key] === undefined) continue;
    if (body[key] === "") {
      fields[key] = null;
      continue;
    }
    const value = Number(body[key]);
    if (!Number.isFinite(value) || Math.abs(value) > limit) {
      return { error: "Please pick a valid farm location on the map" };
    }
    fields[key] = value;
  }

  return { fields };
};

module.exports = { isStrongPassword, PASSWORD_REQUIREMENTS_MESSAGE, pickProfileFields };
