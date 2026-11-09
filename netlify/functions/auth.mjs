// POST /api/auth {password}         -> { ok } (login check)
// PUT  /api/auth {next}  (Bearer)   -> sets a new dashboard password
// GET  /api/auth                    -> { configured, backend }
import { json, sha256, verifyPassword, checkAuth, unauthorized, envPassword } from '../lib/api.mjs';
import { getSetting, setSetting, backend } from '../lib/db.mjs';

export default async (req) => {
  if (req.method === 'GET') {
    const saved = await getSetting('password-hash');
    return json({ configured: !!saved || !!envPassword(), backend });
  }
  if (req.method === 'POST') {
    let body; try { body = await req.json(); } catch { body = {}; }
    const ok = await verifyPassword(body.password || '');
    if (!ok) { await new Promise((r) => setTimeout(r, 600)); return unauthorized(); }
    return json({ ok: true });
  }
  if (req.method === 'PUT') {
    if (!(await checkAuth(req))) return unauthorized();
    let body; try { body = await req.json(); } catch { body = {}; }
    const next = String(body.next || '');
    if (next.length < 8) return json({ error: 'password must be at least 8 characters' }, 400);
    await setSetting('password-hash', await sha256(next));
    return json({ ok: true });
  }
  return json({ error: 'method not allowed' }, 405);
};

export const config = { path: '/api/auth' };
