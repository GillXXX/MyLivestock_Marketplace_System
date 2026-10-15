-- Buyer cancellation requests. Once the seller has started working on an
-- order (past the Inquiry stage), the buyer can no longer cancel it
-- outright: they ask, with a reason, and the seller approves or rejects.
-- A request the seller leaves unanswered is approved automatically after
-- 48 hours (see CANCEL_REQUEST_AUTO_APPROVE_HOURS in utils/orderStock.js).
-- Run this manually against your database — there is no migration runner in this repo.

ALTER TABLE transactions
  ADD COLUMN cancel_requested_at DATETIME NULL DEFAULT NULL,
  ADD COLUMN cancel_reason VARCHAR(255) NULL DEFAULT NULL,
  ADD COLUMN cancel_outcome ENUM('Approved', 'Rejected', 'Auto-approved') NULL DEFAULT NULL,
  ADD COLUMN cancel_responded_at DATETIME NULL DEFAULT NULL;
