-- MAO staff can now approve or reject farmer account verifications (not
-- just the Super Admin), so record who reviewed each one and when — the
-- same accountability listings already have with reviewed_by/reviewed_at.
-- Run this manually against your database — there is no migration runner in this repo.

ALTER TABLE users
  ADD COLUMN verification_reviewed_by INT NULL,
  ADD COLUMN verification_reviewed_at DATETIME NULL;
