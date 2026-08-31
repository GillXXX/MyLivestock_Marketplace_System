-- NOTE: already included in 0000_initial_schema.sql. Do not run this against
-- a fresh database created from 0000 — it will fail with a duplicate-column error.

-- Lets a farmer actually submit evidence (a valid government ID + barangay
-- certificate — realistic for small backyard farmers with no business
-- permit) requesting account verification, instead of admin flipping
-- is_verified with no input or record of why. is_verified stays the
-- canonical display flag; these columns track the request/review workflow
-- around it. verification_document holds a JSON array of {type, url},
-- same convention as livestock_listings.documents.
-- Run this manually against your database — there is no migration runner in this repo.

ALTER TABLE users
  ADD COLUMN verification_document TEXT NULL,
  ADD COLUMN verification_status ENUM('Not Submitted','Pending','Approved','Rejected') NOT NULL DEFAULT 'Not Submitted',
  ADD COLUMN verification_note TEXT NULL,
  ADD COLUMN verification_submitted_at TIMESTAMP NULL;
