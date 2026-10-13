-- Staff accountability:
--  * last_login_at — every account's most recent sign-in.
--  * reviewed_by / reviewed_at — which admin or MAO staff last approved,
--    flagged, rejected or re-queued a listing, and when.
--  * staff_sessions — each admin / MAO staff sign-in and sign-out. Signing
--    out ends that session on the server too. A session with no
--    logged_out_at was never signed out (browser closed, token expired).
-- Accounts with sessions or reviews on record can't be deleted (foreign
-- keys) — deactivate them instead, which keeps the history.
-- Run this manually against your database — there is no migration runner in this repo.

ALTER TABLE users
  ADD COLUMN last_login_at DATETIME NULL DEFAULT NULL;

ALTER TABLE livestock_listings
  ADD COLUMN reviewed_by INT(11) NULL DEFAULT NULL,
  ADD COLUMN reviewed_at DATETIME NULL DEFAULT NULL,
  ADD CONSTRAINT listings_reviewed_by_fk FOREIGN KEY (reviewed_by) REFERENCES users (id);

CREATE TABLE staff_sessions (
  id INT(11) NOT NULL AUTO_INCREMENT,
  user_id INT(11) NOT NULL,
  login_method ENUM('password', 'google') NOT NULL DEFAULT 'password',
  logged_in_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  logged_out_at DATETIME NULL DEFAULT NULL,
  ip_address VARCHAR(45) NULL DEFAULT NULL,
  user_agent VARCHAR(255) NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_staff_sessions_user_login (user_id, logged_in_at),
  CONSTRAINT staff_sessions_user_fk FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
