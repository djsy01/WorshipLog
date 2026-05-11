-- WorshipLog RLS Policies
-- NestJS 서버가 service_role key로 접근하므로 RLS는 선택사항이지만
-- 직접 클라이언트 접근 차단을 위해 기본 정책을 설정한다.

-- RLS 활성화 (기존 테이블)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contis ENABLE ROW LEVEL SECURITY;
ALTER TABLE conti_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE history ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;

-- RLS 활성화 (새로운 테이블 - 004_add_missing_tables.sql 에서 생성)
-- conti_shares, conti_song_sheets: NestJS service_role key로만 접근하므로 RLS 비활성화
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE meditations ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- NestJS 서버는 service_role key를 사용하므로 RLS를 우회한다.
-- 클라이언트에서 직접 Supabase에 접근하는 것을 원천 차단.
-- 모든 anon / authenticated 역할은 기본적으로 거부.

-- (필요 시 추후 Supabase Realtime 등을 위해 정책 추가)
