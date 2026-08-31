-- NOTE: already included in 0000_initial_schema.sql. Do not run this against
-- a fresh database created from 0000 — it will fail with a duplicate-column error.

-- Adds farmer verification / account deactivation flags, and a real
-- notifications table (previously synthesized on every request).
-- Run this manually against your database — there is no migration runner in this repo.

ALTER TABLE users ADD COLUMN is_verified TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1;

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_id INT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
