-- Farmer notifications are synthesized on every request from listings/
-- conversations/transactions (no source-of-truth notifications row), so
-- there was no way to persist that a farmer had read one — "Buyer Inquiry"
-- entries in particular were hardcoded Unread forever, leaving the sidebar
-- notification badge permanently stuck. This table records which synthetic
-- notification ids (e.g. "C-123", "T-45") a farmer has read.
-- Run this manually against your database — there is no migration runner in this repo.

CREATE TABLE farmer_notification_reads (
  farmer_id INT NOT NULL,
  notification_key VARCHAR(50) NOT NULL,
  read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (farmer_id, notification_key)
);
