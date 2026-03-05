-- WorshipLog Seed Data (개발/테스트용)

-- 테스트 유저
INSERT INTO users (id, email, password_hash, name, provider) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@worshiplog.com', crypt('password123', gen_salt('bf')), '관리자', 'local'),
  ('00000000-0000-0000-0000-000000000002', 'user@worshiplog.com', crypt('password123', gen_salt('bf')), '테스트유저', 'local');

-- 테스트 팀
INSERT INTO teams (id, name, description, created_by) VALUES
  ('10000000-0000-0000-0000-000000000001', '새벽이슬 예배팀', '주일 예배를 담당하는 팀입니다.', '00000000-0000-0000-0000-000000000001');

-- 팀 멤버
INSERT INTO team_members (team_id, user_id, role) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'leader'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'member');

-- 테스트 찬양
INSERT INTO songs (title, artist, default_key, tempo, created_by, is_public) VALUES
  ('주 하나님 독생자 예수', '찬양팀', 'G', 72, '00000000-0000-0000-0000-000000000001', true),
  ('주님의 사랑이 나를 숨쉬게 해', '예수전도단', 'D', 80, '00000000-0000-0000-0000-000000000001', true),
  ('내 영혼이 은총 입어', '전통 찬송가', 'C', 68, '00000000-0000-0000-0000-000000000001', true);
