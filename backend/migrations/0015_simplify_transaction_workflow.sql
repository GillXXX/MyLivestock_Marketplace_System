-- Collapses the transaction workflow from 5 stages to 4 by removing
-- "Verification". Nothing ever set transactions.verification_status to
-- Approved/Rejected (the only write site was the now-removed admin gate),
-- so the stage was a permanent dead end whose description ("MAO reviews
-- documents and details") contradicts the current "MAO monitors, doesn't
-- gate" model. Negotiation and Confirmation remain — buyer/seller still
-- drive those.
-- Run this manually against your database — there is no migration runner in this repo.

UPDATE transactions SET workflow_step = 'Confirmation' WHERE workflow_step = 'Verification';

ALTER TABLE transactions
  MODIFY COLUMN workflow_step ENUM('Inquiry','Negotiation','Confirmation','Completed')
  NOT NULL DEFAULT 'Inquiry';

ALTER TABLE transactions
  DROP COLUMN verification_status,
  DROP COLUMN verification_note,
  DROP COLUMN verification_reviewed_at;
