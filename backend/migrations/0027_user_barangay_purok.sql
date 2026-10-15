-- Structured address for farmers: barangay (one of Veruela's 20), purok,
-- and an optional sitio/street, picked from dropdowns on the profile
-- instead of typed, so MAO can count and filter farmers per barangay and
-- purok. farm_location stays as the readable full address built from them.
-- Existing farmers get a best-guess barangay from the address they typed,
-- where it names one; the rest stay NULL ("Not specified") until they
-- update their profile.
-- Run this manually against your database — there is no migration runner in this repo.

ALTER TABLE users
  ADD COLUMN barangay VARCHAR(50) NULL,
  ADD COLUMN purok VARCHAR(50) NULL,
  ADD COLUMN sitio VARCHAR(100) NULL,
  ADD INDEX idx_users_barangay (barangay);

UPDATE users SET barangay = CASE
    WHEN CONCAT_WS(' ', farm_location, location) LIKE '%Anitap%' THEN 'Anitap'
    WHEN CONCAT_WS(' ', farm_location, location) LIKE '%Bacay%' THEN 'Bacay II'
    WHEN CONCAT_WS(' ', farm_location, location) LIKE '%Binongan%' THEN 'Binongan'
    WHEN CONCAT_WS(' ', farm_location, location) LIKE '%Caigangan%' THEN 'Caigangan'
    WHEN CONCAT_WS(' ', farm_location, location) LIKE '%Candiis%' THEN 'Candiis'
    WHEN CONCAT_WS(' ', farm_location, location) LIKE '%Del Monte%' THEN 'Del Monte'
    WHEN CONCAT_WS(' ', farm_location, location) LIKE '%Don Mateo%' THEN 'Don Mateo'
    WHEN CONCAT_WS(' ', farm_location, location) LIKE '%Katipunan%' THEN 'Katipunan'
    WHEN CONCAT_WS(' ', farm_location, location) LIKE '%La Fortuna%' THEN 'La Fortuna'
    WHEN CONCAT_WS(' ', farm_location, location) LIKE '%Limot%' THEN 'Limot'
    WHEN CONCAT_WS(' ', farm_location, location) LIKE '%Magsaysay%' THEN 'Magsaysay'
    WHEN CONCAT_WS(' ', farm_location, location) LIKE '%Masayan%' THEN 'Masayan'
    WHEN CONCAT_WS(' ', farm_location, location) LIKE '%Poblacion%' THEN 'Poblacion'
    WHEN CONCAT_WS(' ', farm_location, location) LIKE '%Sampaguita%' THEN 'Sampaguita'
    WHEN CONCAT_WS(' ', farm_location, location) LIKE '%San Gabriel%' THEN 'San Gabriel'
    WHEN CONCAT_WS(' ', farm_location, location) LIKE '%Cruz%' THEN 'Santa Cruz'
    WHEN CONCAT_WS(' ', farm_location, location) LIKE '%Emelia%' THEN 'Santa Emelia'
    WHEN CONCAT_WS(' ', farm_location, location) LIKE '%Sawagan%' THEN 'Sawagan'
    WHEN CONCAT_WS(' ', farm_location, location) LIKE '%Sinobong%' THEN 'Sinobong'
    WHEN CONCAT_WS(' ', farm_location, location) LIKE '%Sisimon%' THEN 'Sisimon'
  END
WHERE role = 'farmer' AND barangay IS NULL;
