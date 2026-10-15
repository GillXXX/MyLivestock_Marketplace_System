-- NOTE: already included in 0000_initial_schema.sql. Do not run this against
-- a fresh database created from 0000 — it will fail with a duplicate-column error.

-- Lets an admin record why a listing was flagged or rejected, same
-- convention as users.verification_note. Cleared back to NULL whenever a
-- listing is approved/reset so it only ever reflects the current review
-- outcome, not history. Surfaced to the farmer in their notification feed.
-- Run this manually against your database — there is no migration runner in this repo.

ALTER TABLE livestock_listings
  ADD COLUMN review_note TEXT NULL;
