// Supabase session pooler (port 5432)로 DDL 직접 적용
// 사용: DATABASE_URL=postgres://... node apply-ddl.js
const { Client } = require('pg');
require('dotenv').config();

// pooler URL의 포트를 6543→5432로 변경 (session pooler)
const url = (process.env.DATABASE_URL ?? '').replace(':6543/', ':5432/');

const sql = `
CREATE TABLE IF NOT EXISTS meditations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  content TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT TRUE,
  meditation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

async function run() {
  const client = new Client({ connectionString: url });
  await client.connect();
  console.log('Connected. Applying DDL...');
  await client.query(sql);
  console.log('Done.');
  await client.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
