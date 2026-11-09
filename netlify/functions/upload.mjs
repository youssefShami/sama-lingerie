// POST   /api/upload      (body = image bytes, headers x-key + content-type) -> { url }
// DELETE /api/upload?key= -> removes an image
// GET    /api/upload      -> lists stored image keys
import { json, checkAuth, unauthorized } from '../lib/api.mjs';
import { putImage, deleteImage, listImages, backend } from '../lib/db.mjs';

const MAX = 4_500_000; // bytes; the dashboard compresses to ~100-400 KB before upload

export default async (req) => {
  if (!(await checkAuth(req))) return unauthorized();

  if (req.method === 'POST') {
    const key = (req.headers.get('x-key') || '').replace(/[^\w.-]/g, '').slice(0, 120);
    const type = (req.headers.get('content-type') || '').split(';')[0].trim();
    if (!key || !/^image\/(webp|jpeg|png|avif)$/.test(type)) return json({ error: 'need x-key and an image content-type' }, 400);
    const buf = await req.arrayBuffer();
    if (!buf.byteLength) return json({ error: 'empty body' }, 400);
    if (buf.byteLength > MAX) return json({ error: 'image too large' }, 413);
    try {
      const url = await putImage(key, buf, type);
      return json({ ok: true, url, size: buf.byteLength, backend });
    } catch (e) { return json({ error: 'storage error: ' + String(e.message || e) }, 500); }
  }
  if (req.method === 'DELETE') {
    const key = (new URL(req.url).searchParams.get('key') || '').replace(/[^\w.-]/g, '');
    if (!key) return json({ error: 'key required' }, 400);
    await deleteImage(key);
    return json({ ok: true });
  }
  if (req.method === 'GET') return json({ images: await listImages(), backend });
  return json({ error: 'method not allowed' }, 405);
};

export const config = { path: '/api/upload' };
