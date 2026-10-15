-- Adds a quantity field to transactions so a buyer's "Buy Now" order records
-- how many head were ordered (amount = listing price * quantity).
-- Run this manually against your database — there is no migration runner in this repo.

ALTER TABLE transactions
  ADD COLUMN quantity INT NOT NULL DEFAULT 1 AFTER amount;
