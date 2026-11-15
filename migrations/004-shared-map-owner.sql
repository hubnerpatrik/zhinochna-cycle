-- Share links record their creator so the number of active links per account can be limited.
ALTER TABLE cycle_private.shared_maps ADD COLUMN IF NOT EXISTS owner_id text;
CREATE INDEX IF NOT EXISTS shared_maps_owner_expiry ON cycle_private.shared_maps (owner_id, expires_at);
