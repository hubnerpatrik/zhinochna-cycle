CREATE TABLE IF NOT EXISTS cycle_private.shared_maps (
  id uuid PRIMARY KEY,
  map jsonb NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days'
);
CREATE INDEX IF NOT EXISTS shared_maps_expiry ON cycle_private.shared_maps (expires_at);
REVOKE ALL ON cycle_private.shared_maps FROM PUBLIC;
