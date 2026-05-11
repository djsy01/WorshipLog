-- conti_shares, conti_song_sheets는 NestJS Prisma(postgres 슈퍼유저)에서만 접근
-- RLS ENABLE + 정책 없음 = Data API(anon/authenticated) 차단, postgres 슈퍼유저는 RLS 우회하므로 서버 접근 정상

ALTER TABLE conti_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE conti_song_sheets ENABLE ROW LEVEL SECURITY;
