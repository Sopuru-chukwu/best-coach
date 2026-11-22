/**
 * Optional production backend proxy for Gemini API calls (Firebase Cloud Functions v2).
 *
 * Why use this before releasing publicly:
 * Keeps your GEMINI_API_KEY secret on the server instead of bundling it in the mobile app,
 * and requires a valid Firebase Auth ID token on every request.
 *
 * Setup:
 *   1. firebase init functions
 *   2. Copy this handler into functions/index.js
 *   3. firebase functions:secrets:set GEMINI_API_KEY
 *   4. firebase deploy --only functions:aiProxy
 *   5. Set EXPO_PUBLIC_AI_PROXY_URL=https://<region>-<project>.cloudfunctions.net/aiProxy in .env
 */

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const geminiApiKey = defineSecret('GEMINI_API_KEY');
const ALLOWED_MODELS = new Set(['gemini-3.5-flash-lite', 'gemini-3.8-flash']);

exports.aiProxy = onRequest(
  {
    cors: true,
    secrets: [geminiApiKey],
    timeoutSeconds: 90,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: { message: 'Method not allowed' } });
      return;
    }

    // Verify signed-in Firebase user
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) {
      res.status(401).json({ error: { message: 'Missing Firebase Auth token.' } });
      return;
    }

    try {
      await admin.auth().verifyIdToken(idToken);
    } catch {
      res.status(401).json({ error: { message: 'Invalid or expired auth token.' } });
      return;
    }

    const { model = 'gemini-3.5-flash-lite', contents, generationConfig, systemInstruction } =
      req.body || {};

    if (!ALLOWED_MODELS.has(model)) {
      res.status(400).json({ error: { message: `Model "${model}" is not allowed.` } });
      return;
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const upstream = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiApiKey.value(),
        },
        body: JSON.stringify({
          contents,
          generationConfig,
          ...(systemInstruction ? { systemInstruction } : {}),
        }),
      });

      const data = await upstream.json().catch(() => null);
      res.status(upstream.status).json(data || { error: { message: 'Empty upstream response' } });
    } catch (err) {
      res.status(502).json({ error: { message: err?.message || 'Upstream Gemini request failed' } });
    }
  }
);
