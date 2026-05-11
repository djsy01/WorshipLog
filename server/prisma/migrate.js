/**
 * DB 마이그레이션: Team → Organization + Room + Message
 * 실행: node prisma/migrate.js
 */
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  await client.connect();
  console.log('DB 연결 성공');

  try {
    await client.query('BEGIN');

    // 1. contis의 기존 team_id FK 해제 (room 없으니 null로)
    console.log('콘티 team_id null 처리...');
    await client.query(`UPDATE contis SET team_id = NULL`);

    // 2. history의 기존 team_id null 처리
    console.log('히스토리 team_id null 처리...');
    await client.query(`UPDATE history SET team_id = NULL`);

    // 3. 구 테이블 삭제 (의존성 순서대로)
    console.log('구 테이블 삭제...');
    await client.query(`DROP TABLE IF EXISTS community_comments CASCADE`);
    await client.query(`DROP TABLE IF EXISTS community_posts CASCADE`);
    await client.query(`DROP TABLE IF EXISTS team_invites CASCADE`);
    await client.query(`DROP TABLE IF EXISTS team_members CASCADE`);
    await client.query(`DROP TABLE IF EXISTS teams CASCADE`);

    // 4. organizations 테이블 생성
    console.log('organizations 테이블 생성...');
    await client.query(`
      CREATE TABLE organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // 5. org_members 테이블 생성
    console.log('org_members 테이블 생성...');
    await client.query(`
      CREATE TABLE org_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'member',
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(org_id, user_id)
      )
    `);

    // 6. org_invites 테이블 생성
    console.log('org_invites 테이블 생성...');
    await client.query(`
      CREATE TABLE org_invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // 7. rooms 테이블 생성
    console.log('rooms 테이블 생성...');
    await client.query(`
      CREATE TABLE rooms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // 8. messages 테이블 생성
    console.log('messages 테이블 생성...');
    await client.query(`
      CREATE TABLE messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        file_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // 9. contis: team_id → room_id
    console.log('contis team_id → room_id 컬럼 변경...');
    await client.query(`ALTER TABLE contis DROP CONSTRAINT IF EXISTS contis_team_id_fkey`);
    await client.query(`ALTER TABLE contis RENAME COLUMN team_id TO room_id`);
    await client.query(`
      ALTER TABLE contis
        ADD CONSTRAINT contis_room_id_fkey
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
    `);

    // 10. history: team_id → org_id
    console.log('history team_id → org_id 컬럼 변경...');
    await client.query(`ALTER TABLE history DROP CONSTRAINT IF EXISTS history_team_id_fkey`);
    await client.query(`ALTER TABLE history RENAME COLUMN team_id TO org_id`);
    await client.query(`
      ALTER TABLE history
        ADD CONSTRAINT history_org_id_fkey
        FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL
    `);

    await client.query('COMMIT');
    console.log('✅ 마이그레이션 완료!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ 마이그레이션 실패, 롤백됨:', err.message);
    throw err;
  } finally {
    await client.end();
  }
}

migrate();
