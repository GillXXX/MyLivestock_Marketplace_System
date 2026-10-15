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

// Longest accepted text per field, matching the database columns (or a
// sensible cap for TEXT columns), so an over-long entry gets a clear
// message instead of being cut off silently or failing with a server error.
const TEXT_LIMITS = {
  fullName: 100,
  email: 100,
  phone: 30,
  location: 150,
  about: 1000,
  breed: 100,
  age: 50,
  weight: 50,
  healthStatus: 100,
  description: 2000,
  message: 2000,
};

// "<label> must be <max> characters or fewer" when value is too long, else null.
const tooLong = (value, max, label) =>
  value != null && String(value).length > max ? `${label} must be ${max} characters or fewer` : null;

// A phone number as people type it here: 7–15 digits, optionally with a
// leading +, spaces, dashes or parentheses (e.g. 0912 345 6789, +63 912-345-6789).
const isValidPhone = (phone) => {
  const value = String(phone || "").trim();
  const digits = value.replace(/\D/g, "");
  return /^\+?[0-9\s\-()]+$/.test(value) && digits.length >= 7 && digits.length <= 15;
};

const PHONE_MESSAGE = "Please enter a valid phone number (7 to 15 digits)";

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
    const error = tooLong(fullName, TEXT_LIMITS.fullName, "Full name");
    if (error) return { error };
    fields.full_name = fullName;
  }

  for (const key of textFields) {
    if (body[key] !== undefined) fields[key] = String(body[key]).trim();
  }

  if (fields.phone && !isValidPhone(fields.phone)) {
    return { error: PHONE_MESSAGE };
  }
  const lengthError =
    tooLong(fields.location, TEXT_LIMITS.location, "Location") ||
    tooLong(fields.about, TEXT_LIMITS.about, "About");
  if (lengthError) return { error: lengthError };

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

module.exports = {
  isStrongPassword,
  PASSWORD_REQUIREMENTS_MESSAGE,
  pickProfileFields,
  TEXT_LIMITS,
  tooLong,
  isValidPhone,
  PHONE_MESSAGE,
};
