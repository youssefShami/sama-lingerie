// GET /api/catalog -> live catalogue (404 {empty:true} until the dashboard saves once)
// PUT /api/catalog -> replace the catalogue (admin). Cached at the edge for 60 s, dropped on save.
import { json, checkAuth, unauthorized, db, must, CATALOG_CACHE_KEY } from './_lib.js';

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

const CACHE_HEADERS = { 'cache-control': 'public, max-age=0, must-revalidate', 'cdn-cache-control': 'public, max-age=60, stale-while-revalidate=120' };

export async function onRequestGet({ request, env, waitUntil }) {
  const url = new URL(request.url);
  const cache = caches.default;
  const bust = url.searchParams.has('t');
  if (!bust) { const hit = await cache.match(CATALOG_CACHE_KEY); if (hit) return hit; }
  let data;
  try { data = must(await db(env).rpc('get_catalog')); }
  catch (e) { return json({ error: 'database error: ' + String(e.message || e) }, 500); }
  if (!data || (!data.products.length && !data.cats.length)) return json({ empty: true }, 404);
  data.backend = 'supabase';
  const res = json(data, 200, CACHE_HEADERS);
  if (!bust) waitUntil(cache.put(CATALOG_CACHE_KEY, res.clone()));
  return res;
}

export async function onRequestPut({ request, env, waitUntil }) {
  if (!(await checkAuth(request, env))) return unauthorized();
  let body; try { body = await request.json(); } catch { return json({ error: 'invalid JSON' }, 400); }
  const err = validate(body); if (err) return json({ error: err }, 400);
  try { must(await db(env).rpc('replace_catalog', { c: body })); }
  catch (e) { return json({ error: 'database error: ' + String(e.message || e) }, 500); }
  waitUntil(caches.default.delete(CATALOG_CACHE_KEY));
  return json({ ok: true, updatedAt: new Date().toISOString(), backend: 'supabase' });
}

export const onRequest = ({ request }) => json({ error: `method ${request.method} not allowed` }, 405);
