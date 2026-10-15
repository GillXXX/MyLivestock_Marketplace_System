-- Allows chat messages to carry an image or video attachment (Facebook-style),
-- with or without accompanying text. Run this manually against your database —
-- there is no migration runner in this repo.

ALTER TABLE messages
  MODIFY COLUMN message TEXT NULL,
  ADD COLUMN attachment_url VARCHAR(500) DEFAULT NULL AFTER message,
  ADD COLUMN attachment_type ENUM('image', 'video') DEFAULT NULL AFTER attachment_url;
