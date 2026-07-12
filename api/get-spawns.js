// SPAWN Clinical — paginated gallery listing
// Ported from api/get-spawns.php. Returns { success, spawns, total, page, pages }.
import { sql } from '../lib/db.js';
import { applyCors } from '../lib/http.js';

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const page    = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit   = Math.min(24, Math.max(1, parseInt(req.query.limit, 10) || 12));
  const persona = ['sponsor', 'site', 'patient'].includes(req.query.persona) ? req.query.persona : null;
  const offset  = (page - 1) * limit;

  try {
    let total, rows;
    if (persona) {
      const [{ c }] = await sql`SELECT COUNT(*)::int AS c FROM spawns WHERE status = 'published' AND persona = ${persona}`;
      total = c;
      rows = await sql`
        SELECT id, product_name, tagline, persona, creator_name, creator_comment, spawn_data, created_at
        FROM spawns
        WHERE status = 'published' AND persona = ${persona}
        ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    } else {
      const [{ c }] = await sql`SELECT COUNT(*)::int AS c FROM spawns WHERE status = 'published'`;
      total = c;
      rows = await sql`
        SELECT id, product_name, tagline, persona, creator_name, creator_comment, spawn_data, created_at
        FROM spawns
        WHERE status = 'published'
        ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    }

    // spawn_data is JSONB → already parsed into objects by the driver.
    return res.status(200).json({
      success: true,
      spawns: rows,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
