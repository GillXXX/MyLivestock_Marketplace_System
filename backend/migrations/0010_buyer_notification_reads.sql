-- Same problem as 0009 (farmer_notification_reads), but for buyers: buyer
-- notifications are synthesized on every request from inquiries/transactions
-- with no persisted read state, so the notification badge could never
-- actually clear. This table records which synthetic notification ids
-- (e.g. "I-12", "T-45") a buyer has read.
-- Run this manually against your database — there is no migration runner in this repo.

CREATE TABLE buyer_notification_reads (
  buyer_id INT NOT NULL,
  notification_key VARCHAR(50) NOT NULL,
  read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (buyer_id, notification_key)
);
