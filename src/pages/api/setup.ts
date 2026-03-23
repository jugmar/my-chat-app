import postgres from 'postgres';

export async function GET(context) {
  if (!process.env.DATABASE_URL) {
    return new Response(JSON.stringify({ error: "No DATABASE_URL found" }), { status: 500 });
  }

  const sql = postgres(process.env.DATABASE_URL);
  
  try {
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS users (
        id text PRIMARY KEY,
        nickname text NOT NULL UNIQUE,
        last_seen timestamp NOT NULL,
        created_at timestamp NOT NULL
      );
    `);
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS rooms (
        id text PRIMARY KEY,
        name text NOT NULL,
        created_at timestamp NOT NULL
      );
    `);
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS messages (
        id text PRIMARY KEY,
        room_id text NOT NULL,
        user_id text NOT NULL,
        content text NOT NULL,
        is_system_message boolean DEFAULT false,
        created_at timestamp NOT NULL
      );
    `);
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS notifications (
        id text PRIMARY KEY,
        user_id text NOT NULL,
        sender_id text NOT NULL,
        room_id text NOT NULL,
        message_id text NOT NULL,
        is_read boolean DEFAULT false,
        created_at timestamp NOT NULL
      );
    `);
    try {
      await sql.unsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen timestamp NOT NULL DEFAULT now();`);
    } catch(e) {}
    
    await sql.end();
    return new Response(JSON.stringify({ success: "Postgres Tables Created Successfully! You can now use the app." }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch(e: any) {
    await sql.end();
    return new Response(JSON.stringify({ error: e.message || String(e), stack: e.stack }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
