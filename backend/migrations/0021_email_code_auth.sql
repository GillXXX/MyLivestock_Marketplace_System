-- Registration order is: email -> verify the emailed 6-digit code -> only
-- then set a password (sign-in stays email + password — see login in
-- authController.js). registration_codes tracks that in-progress state:
-- a row starts unverified with just the hashed code, flips to verified
-- once the code checks out, and is only deleted once completeRegistration
-- turns it into a real `users` row with the password chosen after
-- verification.
--
-- otp_expires_at is given an explicit DEFAULT so MySQL doesn't silently
-- attach its legacy "sole timestamp column with no default" behavior —
-- ON UPDATE CURRENT_TIMESTAMP — which would otherwise reset the expiry to
-- "now" on any unrelated UPDATE to the row (e.g. bumping otp_attempts on a
-- wrong guess), making the next attempt look expired even though it wasn't.
CREATE TABLE `registration_codes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(100) NOT NULL,
  `otp_hash` char(64) NOT NULL,
  `otp_expires_at` timestamp NOT NULL DEFAULT '2000-01-01 00:00:00',
  `otp_attempts` tinyint(4) NOT NULL DEFAULT 0,
  `verified` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- An account created via Google or a verified registration code with no
-- upfront form starts with a placeholder name/phone and the "buyer" role,
-- and must complete a short onboarding step (Farmer/Buyer + name + phone —
-- see completeProfile in authController.js) before it's treated as fully
-- set up. Existing accounts already collected this through the old
-- registration form, so they default to already-complete.
ALTER TABLE users
  ADD COLUMN `profile_completed` tinyint(1) NOT NULL DEFAULT 1;
