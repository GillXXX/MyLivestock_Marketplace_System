-- Sign-up now asks people to agree to the Privacy Notice (/privacy) before
-- their account is created, as the Data Privacy Act of 2012 (RA 10173)
-- expects; this records when they did. Accounts created before this have
-- NULL here.
-- Run this manually against your database — there is no migration runner in this repo.

ALTER TABLE users
  ADD COLUMN privacy_consented_at DATETIME NULL;
