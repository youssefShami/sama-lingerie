// POST /api/auth {password}        -> { ok } (login check)
// PUT  /api/auth {next}  (Bearer)  -> sets a new dashboard password (stored as a hash in `settings`)
// GET  /api/auth                   -> { configured, backend }
import { json, unauthorized, sha256Hex, verifyPassword, checkAuth, getSetting, setSetting } from './_lib.js';

export async function onRequestGet({ env }) {
  try {
    const saved = await getSetting(env, 'password-hash');
    return json({ configured: !!saved || !!env.SAMA_ADMIN_PASSWORD, backend: 'supabase' });
  } catch (e) { return json({ configured: !!env.SAMA_ADMIN_PASSWORD, backend: 'supabase', warning: e.message }); }
}

export async function onRequestPost({ request, env }) {
  let body; try { body = await request.json(); } catch { body = {}; }
  let ok = false;
  try { ok = await verifyPassword(env, body.password || ''); } catch (e) { return json({ error: 'database error: ' + e.message }, 500); }
  if (!ok) { await new Promise((r) => setTimeout(r, 600)); return unauthorized(); }
  return json({ ok: true });
}

export async function onRequestPut({ request, env }) {
  if (!(await checkAuth(request, env))) return unauthorized();
  let body; try { body = await request.json(); } catch { body = {}; }
  const next = String(body.next || '');
  if (next.length < 8) return json({ error: 'password must be at least 8 characters' }, 400);
  await setSetting(env, 'password-hash', await sha256Hex(next));
  return json({ ok: true });
}

export const onRequest = ({ request }) => json({ error: `method ${request.method} not allowed` }, 405);
