-- Lets an admin explicitly approve or reject a transaction's Verification
-- stage before the seller is allowed to advance it to Confirmation. Without
-- this, advanceTransactionStep had no way to know whether the admin had
-- actually reviewed the deal, so a seller could walk straight through
-- Verification unchecked.
-- Run this manually against your database — there is no migration runner in this repo.

ALTER TABLE transactions
  ADD COLUMN verification_status ENUM('Not Required','Pending','Approved','Rejected') NOT NULL DEFAULT 'Not Required' AFTER workflow_step,
  ADD COLUMN verification_note VARCHAR(500) NULL AFTER verification_status,
  ADD COLUMN verification_reviewed_at TIMESTAMP NULL AFTER verification_note;
