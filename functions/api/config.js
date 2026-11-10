// GET /api/config -> public, non-secret settings the site needs (Google sign-in client id)
import { json } from './_lib.js';

export async function onRequestGet({ env }) {
  return json({
    googleClientId: env.GOOGLE_CLIENT_ID || null,
    firebaseApiKey: env.FIREBASE_API_KEY || null,
    firebaseAuthDomain: env.FIREBASE_AUTH_DOMAIN || null,
    firebaseProjectId: env.FIREBASE_PROJECT_ID || null
  }, 200, { 'cache-control': 'public, max-age=300' });
}
