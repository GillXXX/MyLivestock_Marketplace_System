-- Lets a sender unsend/delete their own chat message (Facebook-style "You
-- removed a message"). The row is kept with its content cleared and
-- deleted_at set, rather than hard-deleted, so the placeholder can still
-- render in place for the other party. Run this manually against your
-- database — there is no migration runner in this repo.

ALTER TABLE messages
  ADD COLUMN deleted_at DATETIME DEFAULT NULL AFTER attachment_type;
