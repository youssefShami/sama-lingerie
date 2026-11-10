// Orders
//   GET   /api/orders?challenge=1   -> a fresh "not a robot" challenge (public)
//   POST  /api/orders               -> place an order (public, needs a solved challenge)
//   GET   /api/orders[?status=new]  -> list orders (admin)
//   PATCH /api/orders {id, status}  -> update status (admin)
import { json, checkAuth, unauthorized, db, must, makeChallenge, verifyChallenge } from './_lib.js';

const STATUSES = ['new', 'confirmed', 'delivered', 'cancelled'];
const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B-\u001F]/g, '').trim().slice(0, max);
const ref = () => {
  const d = new Date(); const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let r = ''; for (let i = 0; i < 4; i++) r += A[Math.floor(Math.random() * A.length)];
  return `SM-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}-${r}`;
};

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (url.searchParams.has('challenge')) return json(await makeChallenge(env));
  if (!(await checkAuth(request, env))) return unauthorized();
  const status = url.searchParams.get('status');
  let q = db(env).from('orders').select('*').order('created_at', { ascending: false }).limit(300);
  if (STATUSES.includes(status)) q = q.eq('status', status);
  try { return json({ orders: must(await q) }); } catch (e) { return json({ error: 'database error: ' + e.message }, 500); }
}

export async function onRequestPost({ request, env }) {
  let b; try { b = await request.json(); } catch { return json({ error: 'invalid JSON' }, 400); }
  if (b.website) return json({ error: 'rejected' }, 400);                                   // honeypot
  if (Number(b.started) && Date.now() - Number(b.started) < 2500) return json({ error: 'too fast' }, 400);
  // Phone verification (Firebase Phone Auth): required whenever the site is configured for it.
  let verifiedPhone = null;
  if (env.FIREBASE_API_KEY) {
    if (!b.phone_token) return json({ error: 'phone verification required', code: 'phone' }, 400);
    try {
      const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_API_KEY}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idToken: String(b.phone_token) })
      });
      const info = r.ok ? await r.json() : null;
      const u = info && info.users && info.users[0];
      if (u && u.phoneNumber) verifiedPhone = u.phoneNumber;
    } catch (e) { verifiedPhone = null; }
    if (!verifiedPhone) return json({ error: 'phone verification failed', code: 'phone' }, 400);
  }

  // Identity: a verified Google sign-in, or the "not a robot" challenge (skipped when the phone was verified by SMS).
  let google = null;
  if (b.google_token && env.GOOGLE_CLIENT_ID) {
    try {
      const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(String(b.google_token)));
      const info = r.ok ? await r.json() : null;
      if (info && info.aud === env.GOOGLE_CLIENT_ID && info.email && info.email_verified === 'true' && Number(info.exp) * 1000 > Date.now()) {
        google = { email: info.email.toLowerCase(), sub: info.sub, name: info.name || '' };
      }
    } catch (e) { google = null; }
    if (!google) return json({ error: 'google sign-in could not be verified, please sign in again', code: 'google' }, 400);
  } else if (!verifiedPhone) {
    const capErr = await verifyChallenge(env, b.captcha || {});
    if (capErr) return json({ error: capErr, code: 'captcha' }, 400);
  }

  const name = clean(b.name, 80), phone = verifiedPhone || clean(b.phone, 32).replace(/[^\d+ ]/g, ''), address = clean(b.address, 300), notes = clean(b.notes, 500);
  const lang = b.lang === 'ar' ? 'ar' : 'en';
  if (name.length < 2) return json({ error: 'name required', field: 'name' }, 400);
  if (phone.replace(/\D/g, '').length < 7) return json({ error: 'valid phone required', field: 'phone' }, 400);
  if (address.length < 6) return json({ error: 'address required', field: 'address' }, 400);
  if (!Array.isArray(b.items) || !b.items.length || b.items.length > 40) return json({ error: 'bag is empty', field: 'items' }, 400);

  // Price everything from the live catalogue; never trust client prices.
  let catalog;
  try { catalog = must(await db(env).rpc('get_catalog')); } catch (e) { return json({ error: 'database error: ' + e.message }, 500); }
  const products = (catalog && catalog.products) || [];
  const items = []; let total = 0;
  for (const it of b.items) {
    const p = products.find((x) => x.id === it.id);
    if (!p || p.hidden) return json({ error: `unknown product ${clean(it.id, 40)}`, field: 'items' }, 400);
    if (p.stock === false) return json({ error: `sold out: ${p.en}`, field: 'items', id: p.id }, 409);
    const qty = Math.min(20, Math.max(1, parseInt(it.qty, 10) || 1));
    const line = { id: p.id, name_en: p.en, name_ar: p.ar, size: clean(it.size, 20), color: clean(it.color, 30), qty, price: Number(p.price), img: p.thumb || p.img };
    total += line.price * qty; items.push(line);
  }
  total = Math.round(total * 100) / 100;

  const row = {
    status: 'new', name, phone, address, notes, lang, items, total,
    email: google ? google.email : (clean(b.email, 120).toLowerCase() || null),
    google_sub: google ? google.sub : null,
    phone_verified: !!verifiedPhone,
    captcha_seed: (google || verifiedPhone) ? null : b.captcha.seed,
    ip: request.headers.get('cf-connecting-ip') || null,
    ua: clean(request.headers.get('user-agent'), 200) || null
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await db(env).from('orders').insert({ ...row, ref: ref() }).select().single();
    if (!error) return json({ ok: true, ref: data.ref, id: data.id, total, items, created_at: data.created_at }, 201);
    const msg = String(error.message || '');
    if (/captcha_seed/.test(msg)) return json({ error: 'captcha already used', code: 'captcha' }, 400);
    if (!/ref/.test(msg) || attempt === 2) return json({ error: 'could not save the order, please try again' }, 500);
  }
}

export async function onRequestPatch({ request, env }) {
  if (!(await checkAuth(request, env))) return unauthorized();
  let b; try { b = await request.json(); } catch { return json({ error: 'invalid JSON' }, 400); }
  if (!b.id || !STATUSES.includes(b.status)) return json({ error: 'id and a valid status are required' }, 400);
  const patch = { status: b.status, updated_at: new Date().toISOString() };
  if (b.status === 'confirmed') patch.confirmed_at = new Date().toISOString();
  try {
    const row = must(await db(env).from('orders').update(patch).eq('id', b.id).select().maybeSingle());
    if (!row) return json({ error: 'not found' }, 404);
    return json({ ok: true, order: row });
  } catch (e) { return json({ error: 'database error: ' + e.message }, 500); }
}

export const onRequest = ({ request }) => json({ error: `method ${request.method} not allowed` }, 405);
