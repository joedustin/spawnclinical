// SPAWN Clinical — save a generated spawn to the gallery
// Ported from api/save-spawn.php. Returns { success, id }.
import { sql } from '../lib/db.js';
import { applyCors, readJson } from '../lib/http.js';

const clip = (s, n) => String(s ?? '').replace(/<[^>]*>/g, '').slice(0, n);

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = readJson(req);
  if (!body?.spawn?.productName) {
    return res.status(400).json({ error: 'Missing or invalid spawn data' });
  }

  const spawn   = body.spawn;
  const persona = ['sponsor', 'site', 'patient', 'massextinction'].includes(body.persona) ? body.persona : 'sponsor';

  const productName    = clip(spawn.productName, 255);
  const tagline        = clip(spawn.tagline, 500);
  const firstName      = clip(body.firstName, 255);
  const lastName       = clip(body.lastName, 255);
  const creatorEmail   = clip(body.creatorEmail, 255);
  const creatorComment = clip(body.creatorComment, 1000);
  const spawnPrompt    = clip(body.spawnPrompt, 2000);

  // Display name from first + last, falling back to legacy creatorName field.
  let displayName = `${firstName} ${lastName}`.trim();
  if (!displayName) displayName = clip(body.creatorName || 'Anonymous', 255) || 'Anonymous';

  const insert = (p) => sql`
    INSERT INTO spawns
      (product_name, tagline, persona, creator_name, first_name, last_name,
       creator_email, creator_comment, spawn_prompt, spawn_data)
    VALUES
      (${productName}, ${tagline}, ${p}, ${displayName}, ${firstName}, ${lastName},
       ${creatorEmail}, ${creatorComment}, ${spawnPrompt}, ${JSON.stringify(spawn)}::jsonb)
    RETURNING id`;

  try {
    let rows;
    try {
      rows = await insert(persona);
    } catch (e) {
      // If the DB persona CHECK constraint hasn't been migrated to allow
      // 'massextinction' yet, fall back to 'sponsor' so the save still succeeds.
      if (persona === 'massextinction' && /persona/i.test(e?.message || '')) {
        rows = await insert('sponsor');
      } else {
        throw e;
      }
    }
    return res.status(200).json({ success: true, id: rows[0].id });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to save: ' + e.message });
  }
}
