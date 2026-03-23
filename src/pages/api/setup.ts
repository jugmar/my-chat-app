import pkg from 'pg';
const { Client } = pkg;
import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

export async function GET(context) {
  if (!process.env.DATABASE_URL) {
    return new Response(JSON.stringify({ error: "No DATABASE_URL found" }), { status: 500 });
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  
  try {
    await client.connect();
    await client.query(`
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
    `);

    try {
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen timestamp NOT NULL DEFAULT now();`);
    } catch(e) {}
    
    await client.end();
    return new Response(JSON.stringify({ success: "Postgres Tables Created Successfully! You can now use the app." }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch(e: any) {
    await client.end();
    return new Response(JSON.stringify({ error: e.message || String(e), stack: e.stack }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

