CREATE SCHEMA IF NOT EXISTS cycle_private;
CREATE TABLE IF NOT EXISTS cycle_private.feedback (
  id uuid PRIMARY KEY,
  owner_id text NOT NULL,
  anchor jsonb NOT NULL,
  messages jsonb NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS feedback_owner_updated ON cycle_private.feedback (owner_id, updated_at DESC);
REVOKE ALL ON cycle_private.feedback FROM PUBLIC;
