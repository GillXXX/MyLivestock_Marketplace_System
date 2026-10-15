-- Indexes for the queries that run most often, so they stay fast as data
-- grows: the chat (polled every few seconds by everyone with Messages
-- open), the marketplace, open-deal and cancellation checks, and the admin
-- notification feed. Adding them changes no data.
-- Run this manually against your database — there is no migration runner in this repo.

-- Chat: a conversation's messages in order, and its latest message.
ALTER TABLE messages
  ADD INDEX idx_messages_conversation_created (conversation_id, created_at);

-- Marketplace / seller pages: available listings, newest first.
ALTER TABLE livestock_listings
  ADD INDEX idx_listings_status_created (status, created_at);

-- A buyer's open deal for a listing (chat, Buy Now), and the cancellation
-- auto-approval sweep.
ALTER TABLE transactions
  ADD INDEX idx_transactions_listing_buyer_status (listing_id, buyer_id, status),
  ADD INDEX idx_transactions_status_cancel (status, cancel_outcome, cancel_requested_at);

-- Admin notification feed, newest first.
ALTER TABLE notifications
  ADD INDEX idx_notifications_created (created_at);

-- Admin pages and reports filter users by role.
ALTER TABLE users
  ADD INDEX idx_users_role (role);
