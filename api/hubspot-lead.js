// SPAWN Clinical — HubSpot lead capture
// Ported from api/hubspot-lead.php. Creates a contact via HubSpot Contacts API v3.
//
// Campaign association: HubSpot's marketing-campaign attribution can't be set
// directly through the Contacts API. We stamp two custom properties — create
// both in HubSpot first: `custom_source = "SPAWN Website"` (the origin) and
// `utm_campaign` (the campaign, from the page's ?utm_campaign=). A workflow
// added as a campaign asset, triggered off either value, credits the campaign.
import { applyCors, readJson } from '../lib/http.js';

// Default marketing campaign for site traffic with no utm_campaign of its own.
const DEFAULT_CAMPAIGN = '41501340-SpawnClinical';

function postContact(token, properties) {
  return fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ properties }),
  });
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.HUBSPOT_TOKEN;
  if (!token) return res.status(500).json({ error: 'Server missing HUBSPOT_TOKEN' });

  const body        = readJson(req);
  const firstName   = String(body.firstName ?? '').trim().slice(0, 255);
  const lastName    = String(body.lastName  ?? '').trim().slice(0, 255);
  const email       = String(body.email     ?? '').trim().slice(0, 255);
  const comment     = String(body.comment   ?? '').trim().slice(0, 2000);
  const utmCampaign = String(body.utmCampaign ?? '').trim().slice(0, 255) || DEFAULT_CAMPAIGN;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  const baseProps = {
    firstname:      firstName,
    lastname:       lastName,
    email,
    message:        comment,
    custom_source:  'SPAWN Website', // free-form drill-down — trigger your workflow off this
    hs_lead_status: 'NEW',
  };
  // custom contact property (create it in HubSpot); holds the utm_campaign value
  const props = { ...baseProps, utm_campaign: utmCampaign };

  try {
    let r = await postContact(token, props);

    // HubSpot rejects the whole request if `utm_campaign` doesn't exist yet.
    // Retry once without it so lead capture never breaks before the property
    // is created — the campaign value is simply dropped until then.
    if (r.status === 400) {
      const err = await r.json().catch(() => ({}));
      if (/utm_campaign|does not exist/i.test(err?.message || '')) {
        r = await postContact(token, baseProps);
      } else {
        return res.status(500).json({ error: 'HubSpot API error', details: err?.message || 'HTTP 400' });
      }
    }

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
