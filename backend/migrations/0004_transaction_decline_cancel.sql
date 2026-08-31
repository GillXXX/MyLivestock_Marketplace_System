-- NOTE: already included in 0000_initial_schema.sql. Do not run this against
-- a fresh database created from 0000 — it will fail with a duplicate-column error.

-- Adds Declined/Cancelled terminal states so a farmer can reject an offer,
-- a buyer can withdraw one, and competing offers on a sold listing have
-- somewhere to land instead of being left dangling.
-- Run this manually against your database — there is no migration runner in this repo.

ALTER TABLE transactions MODIFY COLUMN status ENUM('Pending','Completed','Flagged','Declined','Cancelled') NULL DEFAULT 'Pending';
