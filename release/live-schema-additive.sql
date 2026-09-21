-- Prepared for manual review and execution against the separate Live database.
-- This file is not invoked by application startup, build, publish, or post-merge.
-- It contains schema additions only and preserves all existing records.

BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS recruitment_type TEXT;

ALTER TABLE probation_manager_reviews
  ADD COLUMN IF NOT EXISTS manager_editable BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE probation_manager_reviews
  ADD COLUMN IF NOT EXISTS publication_history JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS company_learning_recipients (
  company_learning_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT company_learning_recipients_pkey
    PRIMARY KEY (company_learning_id, user_id),
  CONSTRAINT company_learning_recipients_company_learning_id_fkey
    FOREIGN KEY (company_learning_id)
    REFERENCES company_learning_entries(id),
  CONSTRAINT company_learning_recipients_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS company_learning_recipients_user_id_idx
  ON company_learning_recipients (user_id);

COMMIT;