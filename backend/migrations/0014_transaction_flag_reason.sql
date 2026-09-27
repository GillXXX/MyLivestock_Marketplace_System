-- Lets a farmer flag a transaction for MAO review (e.g. a buyer who seems
-- illegitimate or is behaving suspiciously during negotiation), with an
-- optional note explaining why.
-- Run this manually against your database — there is no migration runner in this repo.

ALTER TABLE transactions
  ADD COLUMN flag_reason TEXT NULL AFTER status;
