// Shared helpers for the Sama API on Cloudflare Pages Functions (Workers runtime, Web Crypto only).
import { createClient } from '@supabase/supabase-js';

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }
  });
export const unauthorized = () => json({ error: 'unauthorized' }, 401);

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
export const sha256Hex = async (s) => hex(await crypto.subtle.digest('SHA-256', enc.encode(String(s))));
export async function hmacHex(key, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}
export function same(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/* ---------------- Supabase ---------------- */
export function db(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY are not set');
  return createClient(env.SUPABASE_URL.replace(/\/$/, ''), env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
export const must = ({ data, error }) => { if (error) throw new Error(error.message || String(error)); return data; };
export const publicImageUrl = (env, key) => `${env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/images/${key}`;

export async function getSetting(env, key) {
  const d = must(await db(env).from('settings').select('value').eq('key', key).maybeSingle());
  return d ? d.value : null;
}
export async function setSetting(env, key, value) {
  must(await db(env).from('settings').upsert({ key, value, updated_at: new Date().toISOString() }));
}

/* ---------------- admin auth ---------------- */
export async function verifyPassword(env, pw) {
  if (!pw) return false;
  const hash = await sha256Hex(pw);
  const saved = await getSetting(env, 'password-hash');
  if (saved) return same(String(saved), hash);
  const e = env.SAMA_ADMIN_PASSWORD || '';
  return !!e && same(await sha256Hex(e), hash);
}
export async function checkAuth(request, env) {
  const h = request.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  return verifyPassword(env, token);
}

/* ---------------- "I'm not a robot": signed proof-of-work challenge ----------------
   The browser asks for a challenge, finds a nonce so that sha256(seed + nonce) starts with
   `bits` zero bits (well under a second in a browser, costly for bulk bots), and sends it
   with the order. The seed is HMAC-signed (unforgeable), expires after 10 minutes and can be
   used once (unique column on the orders table). */
export const CAPTCHA_BITS = 15;
const secret = (env) => env.CAPTCHA_SECRET || env.SAMA_ADMIN_PASSWORD || 'sama-dev-secret';
export async function makeChallenge(env) {
  const seed = hex(crypto.getRandomValues(new Uint8Array(12)));
  const exp = Date.now() + 10 * 60 * 1000;
  const sig = (await hmacHex(secret(env), `${seed}.${exp}`)).slice(0, 32);
  return { seed, exp, sig, bits: CAPTCHA_BITS };
}
export async function verifyChallenge(env, { seed, exp, sig, nonce } = {}) {
  if (!seed || !exp || !sig || nonce == null) return 'captcha missing';
  if (Date.now() > Number(exp)) return 'captcha expired';
  const good = (await hmacHex(secret(env), `${seed}.${exp}`)).slice(0, 32);
  if (!same(String(sig), good)) return 'captcha invalid';
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(`${seed}${nonce}`)));
  let zeros = 0;
  for (const byte of h) { if (byte === 0) { zeros += 8; continue; } zeros += Math.clz32(byte) - 24; break; }
  return zeros < CAPTCHA_BITS ? 'captcha not solved' : null;
}

/* ---------------- edge cache for the catalogue ---------------- */
export const CATALOG_CACHE_KEY = 'https://sama-cache.internal/catalog';
