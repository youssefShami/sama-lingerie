// Data layer with two backends:
//   • Supabase (Postgres + Storage) when SUPABASE_URL and SUPABASE_SERVICE_KEY are set  ← production
//   • Netlify Blobs otherwise                                                              ← local dev / fallback
// Every function below returns plain data so the API routes never care which one is active.
import { getStore } from '@netlify/blobs';
import { createClient } from '@supabase/supabase-js';

const env = (k) => { try { return (globalThis.Netlify && Netlify.env.get(k)) || process.env[k] || ''; } catch { return process.env[k] || ''; } };
export const SUPABASE_URL = env('SUPABASE_URL').replace(/\/$/, '');
const SERVICE_KEY = env('SUPABASE_SERVICE_KEY');
export const backend = SUPABASE_URL && SERVICE_KEY ? 'supabase' : 'blobs';

let _sb = null;
export function sb() {
  if (!_sb) _sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  return _sb;
}
const store = (name) => getStore({ name, consistency: 'strong' });
const must = ({ data, error }) => { if (error) throw new Error(error.message || String(error)); return data; };

/* ---------------- catalogue ---------------- */
export async function getCatalog() {
  if (backend === 'supabase') {
    const data = must(await sb().rpc('get_catalog'));
    if (!data || !Array.isArray(data.products) || !data.products.length && !data.cats.length) return null;
    return data;
  }
  return store('sama').get('catalog', { type: 'json' });
}
export async function setCatalog(catalog) {
  if (backend === 'supabase') { must(await sb().rpc('replace_catalog', { c: catalog })); return; }
  const s = store('sama');
  const prev = await s.get('catalog'); if (prev) await s.set('catalog-prev', prev);
  await s.setJSON('catalog', catalog);
}

/* ---------------- images ---------------- */
export async function putImage(key, buf, type) {
  if (backend === 'supabase') {
    must(await sb().storage.from('images').upload(key, buf, { contentType: type, upsert: true, cacheControl: '31536000' }));
    return `${SUPABASE_URL}/storage/v1/object/public/images/${key}`;
  }
  await store('images').set(key, buf, { metadata: { type, size: buf.byteLength, at: Date.now() } });
  return `/api/img/${key}`;
}
export async function deleteImage(key) {
  if (backend === 'supabase') { must(await sb().storage.from('images').remove([key])); return; }
  await store('images').delete(key);
}
export async function listImages() {
  if (backend === 'supabase') { const d = must(await sb().storage.from('images').list('', { limit: 1000 })); return d.map((f) => f.name); }
  const { blobs } = await store('images').list(); return blobs.map((b) => b.key);
}
export async function getImageStream(key) { // blobs only (Supabase serves its own public URLs)
  if (backend === 'supabase') return null;
  return store('images').getWithMetadata(key, { type: 'stream' });
}

/* ---------------- settings (password hash etc.) ---------------- */
export async function getSetting(key) {
  if (backend === 'supabase') { const d = must(await sb().from('settings').select('value').eq('key', key).maybeSingle()); return d ? d.value : null; }
  const v = await store('auth').get(key); return v == null ? null : JSON.parse(v);
}
export async function setSetting(key, value) {
  if (backend === 'supabase') { must(await sb().from('settings').upsert({ key, value, updated_at: new Date().toISOString() })); return; }
  await store('auth').set(key, JSON.stringify(value));
}

/* ---------------- orders ---------------- */
export async function createOrder(o) {
  if (backend === 'supabase') return must(await sb().from('orders').insert(o).select().single());
  const s = store('orders');
  const row = { id: Date.now(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...o };
  // replay protection for the captcha seed
  if (o.captcha_seed && await s.get(`seed-${o.captcha_seed}`)) throw new Error('duplicate key captcha_seed');
  await s.set(`seed-${o.captcha_seed}`, '1');
  await s.setJSON(`order-${String(row.id).padStart(16, '0')}`, row);
  return row;
}
export async function listOrders({ status, limit = 200 } = {}) {
  if (backend === 'supabase') {
    let q = sb().from('orders').select('*').order('created_at', { ascending: false }).limit(limit);
    if (status) q = q.eq('status', status);
    return must(await q);
  }
  const s = store('orders');
  const { blobs } = await s.list({ prefix: 'order-' });
  const rows = await Promise.all(blobs.map((b) => s.get(b.key, { type: 'json' })));
  return rows.filter(Boolean).filter((r) => !status || r.status === status).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
}
export async function updateOrder(id, patch) {
  patch.updated_at = new Date().toISOString();
  if (backend === 'supabase') return must(await sb().from('orders').update(patch).eq('id', id).select().single());
  const s = store('orders'); const key = `order-${String(id).padStart(16, '0')}`;
  const row = await s.get(key, { type: 'json' }); if (!row) return null;
  Object.assign(row, patch); await s.setJSON(key, row); return row;
}
