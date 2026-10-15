-- Live-animal weights are now saved as a plain number of kg per head (so a
-- per-kg price can be turned into an estimate). Older listings typed it as
-- text — "25kg", "360 kg" — which still displays, but the edit form makes
-- the farmer re-enter it. This turns the simple "<number> kg" ones into the
-- number. Anything else, like a range ("70kg - 80kg"), is left for the
-- farmer to choose, and farm products (free-text sizes) aren't touched.
-- Run this manually against your database — there is no migration runner in this repo.

UPDATE livestock_listings
SET weight = TRIM(REGEXP_REPLACE(weight, '[[:space:]]*(kg|kgs|kilo|kilos)[[:space:]]*$', ''))
WHERE weight REGEXP '^[[:space:]]*[0-9]+([.][0-9]+)?[[:space:]]*(kg|kgs|kilo|kilos)[[:space:]]*$'
  AND livestock_type NOT IN ('Eggs', 'Fruits', 'Vegetables', 'Milk / Dairy', 'Honey')
  AND (category IS NULL OR category = 'livestock' OR livestock_type IN ('Swine', 'Cattle', 'Goat', 'Poultry', 'Carabao', 'Duck'));
