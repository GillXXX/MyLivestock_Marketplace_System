-- Removes the transaction-flagging feature entirely (farmer's "Flag for
-- Review" button, MAO's read-only flag visibility). The farmer already has
-- Decline Offer for killing a bad deal directly, so flagging was redundant.
-- Run this manually against your database — there is no migration runner in this repo.

ALTER TABLE transactions DROP COLUMN flag_reason;
