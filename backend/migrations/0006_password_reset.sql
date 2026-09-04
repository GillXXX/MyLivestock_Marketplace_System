-- NOTE: already included in 0000_initial_schema.sql. Do not run this against
-- a fresh database created from 0000 — it will fail with a duplicate-column error.

-- Adds forgot-password support. reset_token_hash stores a SHA-256 hash of
-- the raw token emailed to the user (never the raw token itself, so a DB
-- leak alone can't be used to reset accounts); reset_token_expires bounds
-- how long that token is valid.
ALTER TABLE users
  ADD COLUMN reset_token_hash CHAR(64) NULL,
  ADD COLUMN reset_token_expires TIMESTAMP NULL;
