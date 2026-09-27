-- Flagging a transaction no longer freezes it — it's now a pure paper-trail
-- report (transactions.flag_reason, set independent of status) that MAO can
-- see, while the farmer/buyer keep negotiating and confirming normally.
-- "Flagged" is dropped from the status enum since nothing sets it anymore.
-- Run this manually against your database — there is no migration runner in this repo.

ALTER TABLE transactions
  MODIFY COLUMN status ENUM('Pending','Completed','Declined','Cancelled')
  NOT NULL DEFAULT 'Pending';
