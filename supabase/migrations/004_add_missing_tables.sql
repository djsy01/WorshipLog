-- Add missing tables from Prisma schema
-- This migration adds tables that were defined in the schema but not in migrations

-- ================================
-- Organizations (교회/사역 조직)
-- ================================
CREATE TABLE IF NOT EXISTS organizations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  created_by  UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations (created_by);

-- ================================
-- Organization Members
-- ================================
CREATE TABLE IF NOT EXISTS org_members (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON org_members (org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members (user_id);

-- ================================
-- Organization Invites
-- ================================
CREATE TABLE IF NOT EXISTS org_invites (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  token          TEXT NOT NULL UNIQUE,
  created_by     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at     TIMESTAMPTZ NOT NULL,
  used_at        TIMESTAMPTZ,
  invitee_email  TEXT,
  status         TEXT NOT NULL DEFAULT 'pending',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_invites_org ON org_invites (org_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_token ON org_invites (token);

-- ================================
-- Rooms (채팅 방)
-- ================================
CREATE TABLE IF NOT EXISTS rooms (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  created_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rooms_org ON rooms (org_id);
CREATE INDEX IF NOT EXISTS idx_rooms_created_by ON rooms (created_by);

-- ================================
-- Messages
-- ================================
CREATE TABLE IF NOT EXISTS messages (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id   UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content   TEXT NOT NULL,
  file_url  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_room ON messages (room_id);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages (user_id);

-- ================================
-- Update Contis table to reference rooms
-- ================================
ALTER TABLE contis ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_contis_room ON contis (room_id);

-- ================================
-- Conti Shares (콘티 공유)
-- ================================
CREATE TABLE IF NOT EXISTS conti_shares (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conti_id  UUID NOT NULL REFERENCES contis(id) ON DELETE CASCADE,
  room_id   UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (conti_id, room_id)
);

CREATE INDEX IF NOT EXISTS idx_conti_shares_conti ON conti_shares (conti_id);
CREATE INDEX IF NOT EXISTS idx_conti_shares_room ON conti_shares (room_id);
CREATE INDEX IF NOT EXISTS idx_conti_shares_user ON conti_shares (shared_by);

-- ================================
-- Conti Song Sheets
-- ================================
CREATE TABLE IF NOT EXISTS conti_song_sheets (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conti_song_id  UUID NOT NULL REFERENCES conti_songs(id) ON DELETE CASCADE,
  url            TEXT NOT NULL,
  order_index    INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conti_song_sheets_conti_song ON conti_song_sheets (conti_song_id);

-- ================================
-- Meditations (묵상)
-- ================================
CREATE TABLE IF NOT EXISTS meditations (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book      TEXT NOT NULL,
  chapter   INTEGER NOT NULL,
  verse     INTEGER NOT NULL,
  content   TEXT NOT NULL,
  note      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meditations_user ON meditations (user_id);

-- ================================
-- Posts (커뮤니티 게시글)
-- ================================
CREATE TABLE IF NOT EXISTS posts (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title          TEXT,
  category       TEXT NOT NULL DEFAULT 'free',
  content        TEXT NOT NULL,
  file_url       TEXT,
  is_anonymous   BOOLEAN NOT NULL DEFAULT true,
  meditation_id  UUID REFERENCES meditations(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_user ON posts (user_id);
CREATE INDEX IF NOT EXISTS idx_posts_meditation ON posts (meditation_id);

-- ================================
-- Comments (커뮤니티 댓글)
-- ================================
CREATE TABLE IF NOT EXISTS comments (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id        UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content        TEXT NOT NULL,
  is_anonymous   BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON comments (post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments (user_id);

-- ================================
-- Add user role column
-- ================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- ================================
-- Add email verification columns
-- ================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- ================================
-- Update triggers for new tables
-- ================================
CREATE TRIGGER IF NOT EXISTS set_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER IF NOT EXISTS set_updated_at BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER IF NOT EXISTS set_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER IF NOT EXISTS set_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
