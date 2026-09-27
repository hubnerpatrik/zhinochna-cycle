CREATE SCHEMA IF NOT EXISTS cycle_private;
REVOKE ALL ON SCHEMA cycle_private FROM PUBLIC;
CREATE TABLE IF NOT EXISTS cycle_private.account_state (
  user_id text PRIMARY KEY,
  version integer NOT NULL CHECK (version > 0),
  mutation_id uuid NOT NULL,
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON cycle_private.account_state FROM PUBLIC;
ALTER TABLE cycle_private.account_state ENABLE ROW LEVEL SECURITY;
-- No public/Data API policies. Only the trusted backend table owner accesses rows.
