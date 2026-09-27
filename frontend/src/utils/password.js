// Mirrors backend/utils/validators.js's rule so the live hint shown while
// typing matches exactly what the server will actually accept.
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const PASSWORD_HINT = "Use 8+ characters with an uppercase letter, a lowercase letter, and a number.";

export const isWeakPassword = (password) => password.length > 0 && !PASSWORD_PATTERN.test(password);
