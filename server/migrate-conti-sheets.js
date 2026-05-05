const { Client } = require('pg');
require('dotenv').config();

const url = (process.env.DATABASE_URL ?? '').replace(':6543/', ':5432/');

const sql = `
CREATE TABLE IF NOT EXISTS conti_song_sheets (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conti_song_id UUID        NOT NULL REFERENCES conti_songs(id) ON DELETE CASCADE,
  url           TEXT        NOT NULL,
  order_index   INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO conti_song_sheets (conti_song_id, url, order_index)
SELECT id::uuid, sheet_music_url, 0
FROM conti_songs
WHERE sheet_music_url IS NOT NULL;

ALTER TABLE conti_songs DROP COLUMN IF EXISTS sheet_music_url;
`;

async function run() {
  const client = new Client({ connectionString: url });
  await client.connect();
  console.log('Connected. Applying migration...');
  await client.query(sql);
  console.log('Done. conti_song_sheets created, existing data migrated, sheet_music_url column removed.');
  await client.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
