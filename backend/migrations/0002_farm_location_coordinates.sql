-- NOTE: already included in 0000_initial_schema.sql. Do not run this against
-- a fresh database created from 0000 — it will fail with a duplicate-column error.

-- Adds real coordinates for a farmer's farm location so it can be plotted
-- on an actual map instead of decorative placeholder pins.
-- Run this manually against your database — there is no migration runner in this repo.

ALTER TABLE users ADD COLUMN farm_lat DECIMAL(10,7) NULL;
ALTER TABLE users ADD COLUMN farm_lng DECIMAL(10,7) NULL;
