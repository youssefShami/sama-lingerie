// Orders
//   GET   /api/orders?challenge=1        -> a fresh "not a robot" challenge (public)
//   POST  /api/orders                    -> place an order (public, needs solved challenge)
//   GET   /api/orders[?status=new]       -> list orders (admin)
//   PATCH /api/orders  {id, status}      -> update status (admin)
import { json, checkAuth, unauthorized, makeChallenge, verifyChallenge } from '../lib/api.mjs';
import { getCatalog, createOrder, listOrders, updateOrder } from '../lib/db.mjs';

const STATUSES = ['new', 'confirmed', 'delivered', 'cancelled'];
const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B-\u001F]/g, '').trim().slice(0, max);
const ref = () => {
  const d = new Date(); const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let r = ''; for (let i = 0; i < 4; i++) r += A[Math.floor(Math.random() * A.length)];
  return `SM-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}-${r}`;
};

export default async (req, context) => {
  const url = new URL(req.url);

  if (req.method === 'GET' && url.searchParams.has('challenge')) return json(makeChallenge());

  if (req.method === 'POST') {
    let b; try { b = await req.json(); } catch { return json({ error: 'invalid JSON' }, 400); }
    if (b.website) return json({ error: 'rejected' }, 400);                       // honeypot field
    if (Number(b.started) && Date.now() - Number(b.started) < 2500) return json({ error: 'too fast' }, 400);
    const capErr = verifyChallenge(b.captcha || {});
    if (capErr) return json({ error: capErr, code: 'captcha' }, 400);

    const name = clean(b.name, 80), phone = clean(b.phone, 32).replace(/[^\d+ ]/g, ''), address = clean(b.address, 300), notes = clean(b.notes, 500);
    const lang = b.lang === 'ar' ? 'ar' : 'en';
    if (name.length < 2) return json({ error: 'name required', field: 'name' }, 400);
    if (phone.replace(/\D/g, '').length < 7) return json({ error: 'valid phone required', field: 'phone' }, 400);
    if (address.length < 6) return json({ error: 'address required', field: 'address' }, 400);
    if (!Array.isArray(b.items) || !b.items.length || b.items.length > 40) return json({ error: 'bag is empty', field: 'items' }, 400);

    // Price everything from the live catalogue — never trust client prices.
    const catalog = await getCatalog();
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

    let order;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        order = await createOrder({
          ref: ref(), status: 'new', name, phone, address, notes, lang, items, total,
          captcha_seed: b.captcha.seed,
          ip: (req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null,
          ua: clean(req.headers.get('user-agent'), 200) || null
        });
        break;
      } catch (e) {
        const msg = String(e.message || e);
        if (/captcha_seed/.test(msg)) return json({ error: 'captcha already used', code: 'captcha' }, 400);
        if (!/ref/.test(msg) || attempt === 2) return json({ error: 'could not save the order, please try again' }, 500);
      }
    }
    return json({ ok: true, ref: order.ref, id: order.id, total, items, created_at: order.created_at }, 201);
  }

  // ---- admin ----
  if (!(await checkAuth(req))) return unauthorized();
  if (req.method === 'GET') {
    const status = url.searchParams.get('status');
    const rows = await listOrders({ status: STATUSES.includes(status) ? status : undefined, limit: 300 });
    return json({ orders: rows });
  }
  if (req.method === 'PATCH') {
    let b; try { b = await req.json(); } catch { return json({ error: 'invalid JSON' }, 400); }
    if (!b.id || !STATUSES.includes(b.status)) return json({ error: 'id and a valid status are required' }, 400);
    const patch = { status: b.status };
    if (b.status === 'confirmed') patch.confirmed_at = new Date().toISOString();
    const row = await updateOrder(b.id, patch);
    if (!row) return json({ error: 'not found' }, 404);
    return json({ ok: true, order: row });
  }
  return json({ error: 'method not allowed' }, 405);
};

export const config = { path: '/api/orders' };
