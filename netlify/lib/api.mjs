// Shared helpers for the Sama API (Netlify Functions v2)
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { getSetting } from './db.mjs';

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }
  });

export const sha256 = async (s) => createHash('sha256').update(String(s), 'utf8').digest('hex');

export function same(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function envPassword() {
  try { return (globalThis.Netlify && Netlify.env.get('SAMA_ADMIN_PASSWORD')) || process.env.SAMA_ADMIN_PASSWORD || ''; }
  catch { return process.env.SAMA_ADMIN_PASSWORD || ''; }
}

/** Password check: a password set from the dashboard (stored as a hash) wins over the env var. */
export async function verifyPassword(pw) {
  if (!pw) return false;
  const hash = await sha256(pw);
  const saved = await getSetting('password-hash');
  if (saved) return same(String(saved), hash);
  const env = envPassword();
  return !!env && same(await sha256(env), hash);
}

export async function checkAuth(req) {
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  return verifyPassword(token);
}

export const unauthorized = () => json({ error: 'unauthorized' }, 401);

/* ---------------- "I'm not a robot": signed proof-of-work challenge ----------------
   The browser asks for a challenge, computes a nonce so that sha256(seed + nonce) starts with
   `bits` zero bits (≈ half a second of hashing for a human's browser, expensive for bulk bots),
   and sends seed + nonce with the order. The seed is HMAC-signed so it cannot be forged, expires
   in 10 minutes, and can only be used once (unique column in the orders table). */
const secret = () => envPassword() || 'sama-dev-secret';
export const CAPTCHA_BITS = 15;
export function makeChallenge() {
  const seed = createHash('sha256').update(String(Math.random()) + Date.now()).digest('hex').slice(0, 24);
  const exp = Date.now() + 10 * 60 * 1000;
  const sig = createHmac('sha256', secret()).update(`${seed}.${exp}`).digest('hex').slice(0, 32);
  return { seed, exp, sig, bits: CAPTCHA_BITS };
}
export function verifyChallenge({ seed, exp, sig, nonce }) {
  if (!seed || !exp || !sig || nonce == null) return 'captcha missing';
  if (Date.now() > Number(exp)) return 'captcha expired';
  const good = createHmac('sha256', secret()).update(`${seed}.${exp}`).digest('hex').slice(0, 32);
  if (!same(String(sig), good)) return 'captcha invalid';
  const h = createHash('sha256').update(`${seed}${nonce}`).digest();
  let zeros = 0;
  for (const byte of h) { if (byte === 0) { zeros += 8; continue; } zeros += Math.clz32(byte) - 24; break; }
  if (zeros < CAPTCHA_BITS) return 'captcha not solved';
  return null;
}
