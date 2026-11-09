// GET  /api/catalog  -> the live catalogue (404 when nothing saved yet: site falls back to products.js)
// PUT  /api/catalog  -> replace the catalogue (admin)
import { purgeCache } from '@netlify/functions';
import { json, checkAuth, unauthorized } from '../lib/api.mjs';
import { getCatalog, setCatalog, backend } from '../lib/db.mjs';

// Served from Netlify's edge cache (durable = shared across all edge nodes) and purged the moment
// the dashboard saves, so visitors get a ~10 ms cached response and still see changes instantly.
const CACHE = {
  'cache-control': 'public, max-age=0, must-revalidate',
  'netlify-cdn-cache-control': 'public, durable, s-maxage=86400, stale-while-revalidate=60',
  'netlify-cache-tag': 'catalog'
};

const isStr = (v) => typeof v === 'string';
const slug = /^[a-z0-9][a-z0-9_-]{0,40}$/i;

function validate(c) {
  if (!c || typeof c !== 'object') return 'catalog must be an object';
  if (!Array.isArray(c.cats) || !Array.isArray(c.products) || !Array.isArray(c.deals)) return 'cats, products and deals must be arrays';
  if (!c.about || typeof c.about !== 'object') return 'about must be an object';
  if (!c.colors || typeof c.colors !== 'object') return 'colors must be an object';
  const catIds = new Set();
  for (const k of c.cats) {
    if (!k || !slug.test(k.id || '') || k.id === 'all' || !isStr(k.en) || !isStr(k.ar)) return `bad category ${JSON.stringify(k && k.id)}`;
    if (catIds.has(k.id)) return `duplicate category ${k.id}`;
    catIds.add(k.id);
  }
  for (const [key, col] of Object.entries(c.colors)) {
    if (!slug.test(key) || !col || !isStr(col.en) || !isStr(col.ar) || !/^#[0-9a-f]{6}$/i.test(col.hex || '')) return `bad colour ${key}`;
  }
  const ids = new Set();
  for (const p of c.products) {
    if (!p || !slug.test(p.id || '')) return 'product without a valid id';
    if (ids.has(p.id)) return `duplicate product id ${p.id}`;
    ids.add(p.id);
    if (!catIds.has(p.cat)) return `product ${p.id}: unknown category ${p.cat}`;
    if (!isStr(p.en) || !isStr(p.ar)) return `product ${p.id}: names required`;
    if (!(Number(p.price) >= 0)) return `product ${p.id}: bad price`;
    if (p.old != null && p.old !== '' && !(Number(p.old) > Number(p.price))) return `product ${p.id}: old price must be higher than price`;
    if (!isStr(p.img)) return `product ${p.id}: image required`;
    if (!Array.isArray(p.sizes) || !Array.isArray(p.colors)) return `product ${p.id}: sizes/colors must be arrays`;
    for (const col of p.colors) if (!c.colors[col]) return `product ${p.id}: unknown colour ${col}`;
  }
  for (const d of c.deals) if (!d || !slug.test(d.id || '') || !isStr(d.en) || !isStr(d.ar)) return 'bad offer card';
  if (JSON.stringify(c).length > 1_500_000) return 'catalog too large';
  return null;
}

export default async (req) => {
  if (req.method === 'GET') {
    let data;
    try { data = await getCatalog(); } catch (e) { return json({ error: 'database error: ' + String(e.message || e) }, 500); }
    if (!data) return json({ empty: true, backend }, 404, CACHE);
    data.backend = backend;
    return json(data, 200, CACHE);
  }
  if (req.method === 'PUT') {
    if (!(await checkAuth(req))) return unauthorized();
    let body;
    try { body = await req.json(); } catch { return json({ error: 'invalid JSON' }, 400); }
    const err = validate(body);
    if (err) return json({ error: err }, 400);
    body.updatedAt = new Date().toISOString();
    try { await setCatalog(body); } catch (e) { return json({ error: 'database error: ' + String(e.message || e) }, 500); }
    let purged = true;
    try { await purgeCache({ tags: ['catalog'] }); } catch (e) { purged = false; } // local dev has no purge token
    return json({ ok: true, updatedAt: body.updatedAt, purged, backend });
  }
  return json({ error: 'method not allowed' }, 405);
};

export const config = { path: '/api/catalog' };
