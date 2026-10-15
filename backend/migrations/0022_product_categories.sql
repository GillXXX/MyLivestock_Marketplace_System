-- Lets farmers post backyard farm products (eggs, fruits, vegetables, ...)
-- alongside live animals, per the adviser's feedback that listings
-- shouldn't be limited to Swine/Cattle/Goat/Poultry.
--   category: 'livestock' (live animals — barangay health certificate
--             required) or 'product' (farm products — documents optional).
--             Needed for custom "Other" types, whose name alone doesn't say
--             which it is. Existing rows were all livestock.
--   unit:     what the price and quantity are counted in (head, kg, tray,
--             dozen, piece, bundle, liter, bottle, sack). Existing rows
--             were priced per head.
-- Run this manually against your database — there is no migration runner in this repo.

ALTER TABLE livestock_listings
  ADD COLUMN category VARCHAR(20) NOT NULL DEFAULT 'livestock' AFTER livestock_type,
  ADD COLUMN unit VARCHAR(20) NOT NULL DEFAULT 'head' AFTER quantity;
