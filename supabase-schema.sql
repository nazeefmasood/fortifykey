-- FortifyKey Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/jzbtggyhilpriltnijww/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User key material (stores encrypted vault key)
CREATE TABLE IF NOT EXISTS user_keys (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              text UNIQUE NOT NULL,  -- Clerk user ID
  master_password_hash text,                   -- bcrypt hash for server-side verification
  encrypted_vault_key  jsonb,                   -- vault key encrypted with master key (nullable until setup complete)
  key_salt             text,                    -- PBKDF2 salt (base64) (nullable until setup complete)
  key_iterations       integer DEFAULT 600000,
  password_hint        text,
  created_at           timestamptz DEFAULT now()
);

-- Polymorphic vault items (all passwords, cards, notes in one table)
CREATE TABLE IF NOT EXISTS vault_items (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            text NOT NULL,
  item_type          text NOT NULL,      -- 'login','card','note','identity','wifi','license','backup_codes'
  name               text NOT NULL,      -- PLAINTEXT: for search & display
  domain             text,               -- PLAINTEXT: normalized domain (login matching)
  category_id        uuid REFERENCES categories(id) ON DELETE SET NULL,
  favorite           boolean DEFAULT false,
  encrypted_data     jsonb NOT NULL,     -- AES-256-GCM encrypted blob (all secrets inside)
  icon_url           text,               -- favicon URL
  password_strength  integer,            -- 0-100 score (for dashboard stats)
  last_used_at       timestamptz,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now(),
  deleted_at         timestamptz,        -- soft delete
  version            integer DEFAULT 1   -- optimistic concurrency
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    text NOT NULL,
  name       text NOT NULL,
  icon       text DEFAULT 'lock',
  color      text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Sync log for offline delta sync
CREATE TABLE IF NOT EXISTS sync_log (
  id          bigserial PRIMARY KEY,
  user_id     text NOT NULL,
  item_id     uuid NOT NULL,
  operation   text NOT NULL,  -- 'INSERT','UPDATE','DELETE'
  version     integer NOT NULL,
  timestamp   timestamptz DEFAULT now()
);

-- Activity log for audit trail
CREATE TABLE IF NOT EXISTS activity_log (
  id          bigserial PRIMARY KEY,
  user_id     text NOT NULL,
  action      text NOT NULL,      -- 'login', 'create_item', 'update_item', 'delete_item', 'generate_password', 'copy_password', etc.
  item_id     uuid,               -- optional: related vault item
  item_type   text,               -- optional: type of vault item
  platform    text NOT NULL,      -- 'web', 'desktop', 'pwa', 'extension'
  metadata    jsonb,              -- optional: additional context
  created_at  timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data
CREATE POLICY vault_items_select ON vault_items
  FOR SELECT USING (user_id = auth.jwt()->>'sub');

CREATE POLICY vault_items_insert ON vault_items
  FOR INSERT WITH CHECK (user_id = auth.jwt()->>'sub');

CREATE POLICY vault_items_update ON vault_items
  FOR UPDATE USING (user_id = auth.jwt()->>'sub');

CREATE POLICY vault_items_delete ON vault_items
  FOR DELETE USING (user_id = auth.jwt()->>'sub');

CREATE POLICY user_keys_select ON user_keys
  FOR SELECT USING (user_id = auth.jwt()->>'sub');

CREATE POLICY user_keys_insert ON user_keys
  FOR INSERT WITH CHECK (user_id = auth.jwt()->>'sub');

CREATE POLICY user_keys_update ON user_keys
  FOR UPDATE USING (user_id = auth.jwt()->>'sub');

CREATE POLICY categories_select ON categories
  FOR SELECT USING (user_id = auth.jwt()->>'sub');

CREATE POLICY categories_insert ON categories
  FOR INSERT WITH CHECK (user_id = auth.jwt()->>'sub');

CREATE POLICY categories_update ON categories
  FOR UPDATE USING (user_id = auth.jwt()->>'sub');

CREATE POLICY categories_delete ON categories
  FOR DELETE USING (user_id = auth.jwt()->>'sub');

CREATE POLICY sync_log_select ON sync_log
  FOR SELECT USING (user_id = auth.jwt()->>'sub');

CREATE POLICY sync_log_insert ON sync_log
  FOR INSERT WITH CHECK (user_id = auth.jwt()->>'sub');

CREATE POLICY activity_log_select ON activity_log
  FOR SELECT USING (user_id = auth.jwt()->>'sub');

CREATE POLICY activity_log_insert ON activity_log
  FOR INSERT WITH CHECK (user_id = auth.jwt()->>'sub');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vault_items_user ON vault_items(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vault_items_domain ON vault_items(user_id, domain) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vault_items_type ON vault_items(user_id, item_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vault_items_category ON vault_items(category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_user ON sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for vault_items
DROP TRIGGER IF EXISTS update_vault_items_updated_at ON vault_items;
CREATE TRIGGER update_vault_items_updated_at
    BEFORE UPDATE ON vault_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for vault_items and categories
ALTER PUBLICATION supabase_realtime ADD TABLE vault_items;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
