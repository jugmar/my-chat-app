import postgres from 'postgres';

async function run() {
  const sql = postgres(process.env.DATABASE_URL, { prepare: false });
  try {
    await sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS password text;`;
    console.log('Migration successful: password column ensured explicitly bypasses Drizzle-kit prompt constraints');
  } catch (e) {
    console.error('Migration error:', e);
  } finally {
    await sql.end();
  }
}
run();
