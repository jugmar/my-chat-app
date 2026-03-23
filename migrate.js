import pkg from 'pg';
const { Client } = pkg;

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen timestamp NOT NULL DEFAULT now()`);
    console.log('Migration successful');
  } catch (e) {
    console.error('Migration error:', e);
  } finally {
    await client.end();
  }
}
run();
