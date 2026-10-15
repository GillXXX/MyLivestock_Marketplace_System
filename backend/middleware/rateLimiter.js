const rateLimit = require("express-rate-limit");

// Login/Google sign-in: the actual brute-force target, so keep this tight.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again in 15 minutes." },
});

// Forgot/reset password: tight enough to stop inbox-spamming or token
// brute-forcing, loose enough that a user who fumbles the form isn't
// locked out for typos.
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many password reset attempts. Please try again in an hour." },
});

// Requesting a registration code (also used for "resend"): loose enough
// for a genuine "it didn't arrive" retry, tight enough to stop
// inbox-spamming/automated account creation.
const codeRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many code requests. Please wait a bit before trying again." },
});

// Verifying the 6-digit registration code: the actual brute-force target
// (only 1,000,000 possible codes), so keep this tight like loginLimiter.
const codeVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in 15 minutes." },
});

// Limits for signed-in actions that write data or upload files, counted
// per account (these run after `protect`), so one account can't flood
// chats with messages or fill the server's disk with uploads. Each sits
// before the upload middleware on its route, so a request over the limit
// is refused before any file is saved. Generous enough for real use.
const perUser = ({ minutes, limit, message, skip }) =>
  rateLimit({
    windowMs: minutes * 60 * 1000,
    limit,
    keyGenerator: (req) => `user:${req.user.id}`,
    skip,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
  });

const isUpload = (req) => req.is("multipart/form-data");

// Text messages and forwards.
const messageLimiter = perUser({
  minutes: 1,
  limit: 40,
  message: "You're sending messages too quickly. Please wait a moment.",
});

// Photo/video attachments in chat (up to 25 MB each), counted on their own.
const attachmentLimiter = perUser({
  minutes: 60,
  limit: 30,
  skip: (req) => !isUpload(req),
  message: "You've sent a lot of photos and videos. Please try again later.",
});

// Offers, accepting, recording weights, and moving or cancelling deals.
const dealLimiter = perUser({
  minutes: 10,
  limit: 40,
  message: "Too many deal updates in a short time. Please wait a few minutes.",
});

// Inquiries, starting deals and saving favorites from the marketplace.
const marketplaceLimiter = perUser({
  minutes: 10,
  limit: 40,
  message: "Too many requests in a short time. Please wait a few minutes.",
});

// Creating, editing, publishing and removing listings (with photo and certificate).
const listingLimiter = perUser({
  minutes: 60,
  limit: 30,
  message: "You've made a lot of listing changes. Please try again later.",
});

// Profile saves (with a profile photo).
const profileLimiter = perUser({
  minutes: 60,
  limit: 20,
  message: "You've updated your profile many times. Please try again later.",
});

// Submitting the government ID and barangay certificate.
const verificationLimiter = perUser({
  minutes: 60,
  limit: 5,
  message: "Too many verification submissions. Please try again in an hour.",
});

module.exports = {
  loginLimiter,
  resetLimiter,
  codeRequestLimiter,
  codeVerifyLimiter,
  messageLimiter,
  attachmentLimiter,
  dealLimiter,
  marketplaceLimiter,
  listingLimiter,
  profileLimiter,
  verificationLimiter,
};
