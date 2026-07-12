// SPAWN Clinical — HubSpot lead capture
// Ported from api/hubspot-lead.php. Creates a contact via HubSpot Contacts API v3.
//
// Campaign association: HubSpot's marketing-campaign attribution can't be set
// directly through the Contacts API. We stamp `custom_source = "SPAWN Website"`
// (a free-form custom property — create it in HubSpot first) and trigger a
// HubSpot workflow off that value to add the contact to the campaign.
import { applyCors, readJson } from '../lib/http.js';

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.HUBSPOT_TOKEN;
  if (!token) return res.status(500).json({ error: 'Server missing HUBSPOT_TOKEN' });

  const body      = readJson(req);
  const firstName = String(body.firstName ?? '').trim().slice(0, 255);
  const lastName  = String(body.lastName  ?? '').trim().slice(0, 255);
  const email     = String(body.email     ?? '').trim().slice(0, 255);
  const comment   = String(body.comment   ?? '').trim().slice(0, 2000);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  const payload = {
    properties: {
      firstname:      firstName,
      lastname:       lastName,
      email,
      message:        comment,
      custom_source:  'SPAWN Website', // free-form drill-down — trigger your workflow off this
      hs_lead_status: 'NEW',
    },
  };

  try {
    const r = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    // 201 created, 200 ok, 409 already exists — all treated as success.
    if (r.status === 201 || r.status === 200 || r.status === 409) {
      return res.status(200).json({ success: true });
    }
    const data = await r.json().catch(() => ({}));
    return res.status(500).json({ error: 'HubSpot API error', details: data?.message || `HTTP ${r.status}` });
  } catch (e) {
    return res.status(502).json({ error: 'Upstream error: ' + e.message });
  }
}
