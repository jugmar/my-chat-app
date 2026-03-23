import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL as string, { prepare: false });

export const db = drizzle(client, { schema });
