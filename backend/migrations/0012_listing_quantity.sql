-- Adds a quantity field to livestock_listings so farmers can specify how many
-- head are available in a listing, and buyers can see current availability.
-- Run this manually against your database — there is no migration runner in this repo.

ALTER TABLE livestock_listings
  ADD COLUMN quantity INT NOT NULL DEFAULT 1 AFTER price;
