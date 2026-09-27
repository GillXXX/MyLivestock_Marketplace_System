-- Adds the "MAO Staff" role, a second privileged role alongside the
-- existing Super Admin ("admin"). MAO Staff can access day-to-day
-- moderation tools (dashboard, listings, verification, transactions,
-- reports, map monitoring, notifications) but cannot manage farmer/buyer
-- accounts, other staff accounts, or system settings — see
-- backend/middleware/roleMiddleware.js for where that split is enforced.
-- Run this manually against your database — there is no migration
-- runner in this repo.

ALTER TABLE users
  MODIFY COLUMN role ENUM('farmer','buyer','admin','mao_staff') NOT NULL;
