-- Adds "Draft" as a valid livestock_listings.status value so the admin's
-- "Default Listing Status" setting (System Settings > General System
-- Configuration) can actually take effect for new listings instead of
-- every listing being hardcoded to "Pending".
-- Run this manually against your database — there is no migration runner in this repo.

ALTER TABLE livestock_listings
  MODIFY COLUMN status ENUM('Available','Pending','Sold','Flagged','Rejected','Removed','Draft')
  NOT NULL DEFAULT 'Available';
