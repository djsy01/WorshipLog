-- WorshipLog Initial Schema
-- Phase 1: 기반 구축 - 사용자, 찬양, 콘티, 팀, 히스토리

-- ================================
-- Extensions
-- ================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================
-- Users
-- ================================
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT NOT NULL UNIQUE,
  password_hash TEXT,                          -- NULL = 소셜 로그인 전용 계정
  name        TEXT NOT NULL,
  profile_image_url TEXT,
  provider    TEXT NOT NULL DEFAULT 'local',   -- 'local' | 'google'
  provider_id TEXT,                            -- 소셜 로그인 provider UID
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_users_provider ON users (provider, provider_id)
  WHERE provider_id IS NOT NULL;

-- ================================
-- Teams (교회/예배팀)
-- ================================
CREATE TABLE teams (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  created_by  UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================
-- Team Members
-- ================================
CREATE TYPE team_role AS ENUM ('leader', 'member');

CREATE TABLE team_members (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id   UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      team_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, user_id)
);

-- ================================
-- Team Invites (Redis TTL로 만료 관리하지만 DB에도 기록)
-- ================================
CREATE TABLE team_invites (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id    UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================
-- Songs (찬양)
-- ================================
CREATE TABLE songs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  artist          TEXT,
  default_key     TEXT,                        -- 'C', 'D', 'G', 'Am' 등
  tempo           INTEGER,                     -- BPM
  lyrics          TEXT,
  sheet_music_url TEXT,                        -- Supabase Storage URL
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  is_public       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_songs_title ON songs USING GIN (to_tsvector('simple', title));
CREATE INDEX idx_songs_created_by ON songs (created_by);

-- ================================
-- Contis (예배 콘티 / 셋리스트)
-- ================================
CREATE TABLE contis (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT NOT NULL,
  description  TEXT,
  team_id      UUID REFERENCES teams(id) ON DELETE SET NULL,    -- NULL = 개인 콘티
  created_by   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  worship_date DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contis_team ON contis (team_id);
CREATE INDEX idx_contis_created_by ON contis (created_by);
CREATE INDEX idx_contis_worship_date ON contis (worship_date);

-- ================================
-- Conti Songs (콘티에 포함된 찬양, 순서 포함)
-- ================================
CREATE TABLE conti_songs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conti_id    UUID NOT NULL REFERENCES contis(id) ON DELETE CASCADE,
  song_id     UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  key         TEXT,                            -- 이 콘티에서 사용할 키 (default_key 오버라이드)
  order_index INTEGER NOT NULL DEFAULT 0,
  note        TEXT,
  UNIQUE (conti_id, order_index)
);

CREATE INDEX idx_conti_songs_conti ON conti_songs (conti_id);

-- ================================
-- History (예배 히스토리)
-- ================================
CREATE TABLE history (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id      UUID REFERENCES teams(id) ON DELETE SET NULL,
  conti_id     UUID REFERENCES contis(id) ON DELETE SET NULL,
  worship_date DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_history_user ON history (user_id);
CREATE INDEX idx_history_team ON history (team_id);
CREATE INDEX idx_history_worship_date ON history (worship_date);

-- ================================
-- Community Posts
-- ================================
CREATE TABLE community_posts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posts_user ON community_posts (user_id);

-- ================================
-- Community Comments
-- ================================
CREATE TABLE community_comments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id    UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_post ON community_comments (post_id);

-- ================================
-- updated_at 자동 갱신 트리거
-- ================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON songs
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON contis
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON community_posts
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON community_comments
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
