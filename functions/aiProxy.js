/**
 * Backend proxy for Gemini API calls (Firebase Cloud Functions v2).
 *
 * Keeps GEMINI_API_KEY on the server instead of bundling it in the app,
 * requires a signed-in, email-verified Firebase user, and caps how much
 * each user can spend per day.
 *
 * Deploy (from the project root):
 *   1. npm install --prefix functions
 *   2. firebase functions:secrets:set GEMINI_API_KEY
 *   3. firebase deploy --only functions:aiProxy,firestore:rules
 *   4. Put the printed URL in .env / EAS env as EXPO_PUBLIC_AI_PROXY_URL
 *
 * Optional: change the daily limit without redeploying code by setting
 *   AI_DAILY_LIMIT in functions/.env (default 150 requests per user per day).
 */

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret, defineInt } = require('firebase-functions/params');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const geminiApiKey = defineSecret('GEMINI_API_KEY');
const dailyLimit = defineInt('AI_DAILY_LIMIT', { default: 150 });

const ALLOWED_MODELS = new Set(['gemini-3.5-flash-lite', 'gemini-3.8-flash']);
const MAX_OUTPUT_TOKENS = 8192;
// Attachments (PDFs/images) arrive base64-encoded inside `contents`.
const MAX_BODY_BYTES = 12 * 1024 * 1024;
const MAX_CONTENT_TURNS = 24;

function sendError(res, status, message) {
  res.status(status).json({ error: { message } });
}

/**
 * Atomically counts this request against the user's daily quota.
 * Returns false when the user has used up today's requests.
 */
async function consumeQuota(uid, limit) {
  const day = new Date().toISOString().slice(0, 10); // UTC date
  const ref = admin.firestore().collection('aiUsage').doc(`${uid}_${day}`);

  return admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = snap.exists ? snap.get('count') || 0 : 0;
    if (count >= limit) return false;
    tx.set(
      ref,
      {
        uid,
        day,
        count: count + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  });
}

exports.aiProxy = onRequest(
  {
    cors: true,
    secrets: [geminiApiKey],
    timeoutSeconds: 90,
    maxInstances: 10,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      sendError(res, 405, 'Method not allowed');
      return;
    }

    // 1. Verify the signed-in Firebase user
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) {
      sendError(res, 401, 'Please sign in to use the coach.');
      return;
    }

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch {
      sendError(res, 401, 'Your session expired. Please sign in again.');
      return;
    }

    if (!decoded.email_verified) {
      sendError(res, 403, 'Please verify your email before using the coach.');
      return;
    }

    // 2. Validate the request shape and size
    const rawSize = req.rawBody ? req.rawBody.length : 0;
    if (rawSize > MAX_BODY_BYTES) {
      sendError(res, 413, 'That file is too large. Please use a smaller file.');
      return;
    }

    const { model = 'gemini-3.5-flash-lite', contents, generationConfig, systemInstruction } =
      req.body || {};

    if (!ALLOWED_MODELS.has(model)) {
      sendError(res, 400, `Model "${model}" is not allowed.`);
      return;
    }

    if (!Array.isArray(contents) || contents.length === 0 || contents.length > MAX_CONTENT_TURNS) {
      sendError(res, 400, 'Invalid request.');
      return;
    }

    const safeConfig = {
      ...(generationConfig && typeof generationConfig === 'object' ? generationConfig : {}),
    };
    safeConfig.maxOutputTokens = Math.min(
      Number(safeConfig.maxOutputTokens) || 2048,
      MAX_OUTPUT_TOKENS
    );

    // 3. Enforce the per-user daily limit
    try {
      const allowed = await consumeQuota(decoded.uid, dailyLimit.value());
      if (!allowed) {
        sendError(
          res,
          429,
          "You've reached today's coaching limit. It resets at midnight UTC — see you tomorrow!"
        );
        return;
      }
    } catch (err) {
      console.error('Quota check failed', err);
      sendError(res, 503, 'The coach is busy right now. Please try again in a moment.');
      return;
    }

    // 4. Forward to Gemini
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
          generationConfig: safeConfig,
          ...(systemInstruction ? { systemInstruction } : {}),
        }),
      });

      const data = await upstream.json().catch(() => null);
      res.status(upstream.status).json(data || { error: { message: 'Empty upstream response' } });
    } catch (err) {
      console.error('Upstream Gemini request failed', err);
      sendError(res, 502, 'The coach could not be reached. Please try again.');
    }
  }
);
