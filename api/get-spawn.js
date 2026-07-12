// SPAWN Clinical — fetch a single spawn by id
// Ported from api/get-spawn.php. Returns { success, spawn }.
import { sql } from '../lib/db.js';
import { applyCors } from '../lib/http.js';

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const id = parseInt(req.query.id, 10) || 0;
  if (id < 1) return res.status(400).json({ error: 'Missing or invalid id' });

  try {
    const rows = await sql`SELECT * FROM spawns WHERE id = ${id} AND status = 'published' LIMIT 1`;
    if (!rows.length) return res.status(404).json({ error: 'Spawn not found' });
    // spawn_data is JSONB → already an object.
    return res.status(200).json({ success: true, spawn: rows[0] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
