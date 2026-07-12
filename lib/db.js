// SPAWN Clinical — Neon Postgres client (serverless HTTP driver)
//
// DATABASE_URL is injected automatically when you connect a Neon database
// to the Vercel project (Storage → Neon). Locally, set it in .env.
//
// Usage:
//   import { sql } from '../lib/db.js';
//   const rows = await sql`SELECT * FROM spawns WHERE id = ${id}`;
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  console.warn('[db] DATABASE_URL is not set — database queries will fail.');
}

export const sql = neon(process.env.DATABASE_URL);
