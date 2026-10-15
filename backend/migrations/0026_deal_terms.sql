-- Structured negotiation ("deal terms") and weighing at pickup, the way
-- live animals are actually traded: buyer and seller go back and forth
-- on a price (per head, or per kg of live weight), a pickup date and
-- place, and how payment is made. One side's offer stands until the other
-- side accepts it (which moves the deal to Confirmation) or counters it.
-- For animals sold by live weight, the seller then records the actual
-- weight at pickup, which sets the final amount before the buyer confirms.
-- listed_amount keeps what the deal was worth at the listed price when it
-- started, so the agreed amount can be compared against it.
-- Every column is nullable, so existing deals carry on exactly as before.
-- Run this manually against your database — there is no migration runner in this repo.

ALTER TABLE transactions
  ADD COLUMN listed_amount DECIMAL(10,2) NULL AFTER amount,
  ADD COLUMN offer_unit_price DECIMAL(10,2) NULL,
  ADD COLUMN offer_pickup_date DATE NULL,
  ADD COLUMN offer_pickup_place VARCHAR(150) NULL,
  ADD COLUMN offer_payment VARCHAR(40) NULL,
  ADD COLUMN offer_note VARCHAR(255) NULL,
  ADD COLUMN offer_by INT NULL,
  ADD COLUMN offer_at DATETIME NULL,
  ADD COLUMN terms_agreed_at DATETIME NULL,
  ADD COLUMN actual_weight_kg DECIMAL(10,2) NULL,
  ADD COLUMN weighed_at DATETIME NULL;
