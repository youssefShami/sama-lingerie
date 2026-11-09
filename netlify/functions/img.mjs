// GET /api/img/:key -> serves an image stored in Netlify Blobs (legacy / local dev).
// With Supabase, photos are served straight from Supabase Storage's public CDN URL instead.
import { getImageStream } from '../lib/db.mjs';

export default async (req, context) => {
  const key = context.params.key || '';
  if (!/^[\w.-]{1,120}$/.test(key)) return new Response('bad key', { status: 400 });
  const res = await getImageStream(key);
  if (!res) return new Response('not found', { status: 404, headers: { 'cache-control': 'no-store' } });
  return new Response(res.data, {
    headers: {
      'content-type': (res.metadata && res.metadata.type) || 'image/webp',
      'cache-control': 'public, max-age=31536000, immutable',
      'netlify-cdn-cache-control': 'public, max-age=31536000, immutable'
    }
  });
};

export const config = { path: '/api/img/:key' };
