// SPAWN Clinical — shared HTTP helpers for serverless functions

const ALLOWLIST = [
  'https://spawnclinical.com',
  'https://www.spawnclinical.com',
  'https://joedustin.com',
  'https://www.joedustin.com',
];

// Reflect allow-listed origins (and localhost / *.vercel.app previews).
// Falls back to '*' for simple public GET endpoints.
export function applyCors(req, res) {
  const origin = req.headers.origin || '';
  const ok =
    ALLOWLIST.includes(origin) ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
    /\.vercel\.app$/.test(origin);
  res.setHeader('Access-Control-Allow-Origin', ok ? origin : '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Vercel auto-parses JSON bodies, but be defensive about string/empty bodies.
export function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}
