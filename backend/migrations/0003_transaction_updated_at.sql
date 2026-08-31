-- NOTE: already included in 0000_initial_schema.sql. Do not run this against
-- a fresh database created from 0000 — it will fail with a duplicate-column error.

-- Tracks when a transaction's workflow_step/status last changed, so
-- notification feeds (which sort by transaction timestamp) reflect the
-- latest workflow update instead of only the original creation time.
-- Run this manually against your database — there is no migration runner in this repo.

ALTER TABLE transactions ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
