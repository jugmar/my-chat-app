import postgres from 'postgres';

async function run() {
  if (!process.env.DATABASE_URL) {
    console.log("No DATABASE_URL found. Skipping migration.");
    return;
  }
  const sql = postgres(process.env.DATABASE_URL);
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id text PRIMARY KEY,
        nickname text NOT NULL UNIQUE,
        last_seen timestamp NOT NULL,
        created_at timestamp NOT NULL
      );
      CREATE TABLE IF NOT EXISTS rooms (
        id text PRIMARY KEY,
        name text NOT NULL,
        created_at timestamp NOT NULL
      );
      CREATE TABLE IF NOT EXISTS messages (
        id text PRIMARY KEY,
        room_id text NOT NULL,
        user_id text NOT NULL,
        content text NOT NULL,
        is_system_message boolean DEFAULT false,
        created_at timestamp NOT NULL
      );
      CREATE TABLE IF NOT EXISTS notifications (
        id text PRIMARY KEY,
        user_id text NOT NULL,
        sender_id text NOT NULL,
        room_id text NOT NULL,
        message_id text NOT NULL,
        is_read boolean DEFAULT false,
        created_at timestamp NOT NULL
      );
      
    `;
    console.log('Postgres Tables Created Successfully');
  } catch(e) {
    console.error('Migration failed:', e);
  } finally {
    await sql.end();
  }
}
run();
