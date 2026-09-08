-- Networking tracker schema: a single "contacts" table, owned per-user via
-- Neon Auth's auth.user_id() and enforced with Row Level Security.
-- Safe to re-run: every statement is idempotent.

CREATE TABLE IF NOT EXISTS contacts (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL DEFAULT auth.user_id(),
  name text NOT NULL CHECK (btrim(name) <> ''),
  company text,
  role text,
  met_where text,
  notes text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Migrate an existing table created before `met_where` replaced `email`/`phone`.
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS met_where text;
ALTER TABLE contacts DROP COLUMN IF EXISTS email;
ALTER TABLE contacts DROP COLUMN IF EXISTS phone;

CREATE INDEX IF NOT EXISTS contacts_user_id_idx ON contacts (user_id);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contacts_select_own ON contacts;
CREATE POLICY contacts_select_own ON contacts
  FOR SELECT TO authenticated
  USING (auth.user_id() = user_id);

DROP POLICY IF EXISTS contacts_insert_own ON contacts;
CREATE POLICY contacts_insert_own ON contacts
  FOR INSERT TO authenticated
  WITH CHECK (auth.user_id() = user_id);

DROP POLICY IF EXISTS contacts_update_own ON contacts;
CREATE POLICY contacts_update_own ON contacts
  FOR UPDATE TO authenticated
  USING (auth.user_id() = user_id)
  WITH CHECK (auth.user_id() = user_id);

DROP POLICY IF EXISTS contacts_delete_own ON contacts;
CREATE POLICY contacts_delete_own ON contacts
  FOR DELETE TO authenticated
  USING (auth.user_id() = user_id);

-- The Data API's `authenticated` role needs explicit table/sequence grants;
-- RLS policies alone are not enough (RLS only filters rows the role can
-- already see once granted).
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON contacts TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE contacts_id_seq TO authenticated;
