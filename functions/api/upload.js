// POST   /api/upload (body = image bytes, headers x-key + content-type) -> { url } on Supabase Storage
// DELETE /api/upload?key=                                                -> removes an image
// GET    /api/upload                                                     -> lists stored image keys
import { json, checkAuth, unauthorized, db, must, publicImageUrl } from './_lib.js';

const MAX = 4_500_000; // bytes; the dashboard compresses to ~100-400 KB before upload

export async function onRequestPost({ request, env }) {
  if (!(await checkAuth(request, env))) return unauthorized();
  const key = (request.headers.get('x-key') || '').replace(/[^\w.-]/g, '').slice(0, 120);
  const type = (request.headers.get('content-type') || '').split(';')[0].trim();
  if (!key || !/^image\/(webp|jpeg|png|avif)$/.test(type)) return json({ error: 'need x-key and an image content-type' }, 400);
  const buf = await request.arrayBuffer();
  if (!buf.byteLength) return json({ error: 'empty body' }, 400);
  if (buf.byteLength > MAX) return json({ error: 'image too large' }, 413);
  try {
    must(await db(env).storage.from('images').upload(key, buf, { contentType: type, upsert: true, cacheControl: '31536000' }));
    return json({ ok: true, url: publicImageUrl(env, key), size: buf.byteLength, backend: 'supabase' });
  } catch (e) { return json({ error: 'storage error: ' + String(e.message || e) }, 500); }
}

export async function onRequestDelete({ request, env }) {
  if (!(await checkAuth(request, env))) return unauthorized();
  const key = (new URL(request.url).searchParams.get('key') || '').replace(/[^\w.-]/g, '');
  if (!key) return json({ error: 'key required' }, 400);
  try { must(await db(env).storage.from('images').remove([key])); return json({ ok: true }); }
  catch (e) { return json({ error: 'storage error: ' + e.message }, 500); }
}

export async function onRequestGet({ request, env }) {
  if (!(await checkAuth(request, env))) return unauthorized();
  try { const d = must(await db(env).storage.from('images').list('', { limit: 1000 })); return json({ images: d.map((f) => f.name), backend: 'supabase' }); }
  catch (e) { return json({ error: 'storage error: ' + e.message }, 500); }
}

export const onRequest = ({ request }) => json({ error: `method ${request.method} not allowed` }, 405);
