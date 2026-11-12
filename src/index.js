import { createRemoteJWKSet, jwtVerify } from "jose";

// Shares the D1 database of money.kasion.dev (binding DB, table kv keyed by
// Firebase uid + key). Signing in with the same Gmail on both sites gives the
// same uid, so the two apps see the same account.
//   mexico_state — this app's data, read + write
//   money_state  — Kasidit Money's data, read only (dashboard summary)
const WRITABLE_KEYS = new Set(["mexico_state"]);
const READABLE_KEYS = new Set(["mexico_state", "money_state"]);

const MAX_VALUE_BYTES = 768 * 1024;

const FIREBASE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

let jwks = null;
function getJwks() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(FIREBASE_JWKS_URL));
  return jwks;
}

async function verifyFirebaseToken(request, env) {
  if (!env.FIREBASE_PROJECT_ID) return null;
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,
      audience: env.FIREBASE_PROJECT_ID,
    });
    if (typeof payload.sub !== "string") return null;
    return { uid: payload.sub, email: typeof payload.email === "string" ? payload.email.toLowerCase() : "" };
  } catch {
    return null;
  }
}

// Same owner rule as money.kasion.dev: only Gmail addresses containing
// OWNER_MATCH are stored server-side. Unlike the money Worker, this one never
// deletes rows — cleanup of the shared table stays with the money app.
function isOwner(email, env) {
  const needle = String(env.OWNER_MATCH || "kasidit").toLowerCase();
  return Boolean(email) && email.includes(needle);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({ ok: true, authConfigured: Boolean(env.FIREBASE_PROJECT_ID) });
    }

    const match = url.pathname.match(/^\/api\/kv\/([\w-]+)$/);
    if (match) {
      const key = match[1];
      if (!READABLE_KEYS.has(key)) return new Response("not found", { status: 404 });

      const auth = await verifyFirebaseToken(request, env);
      if (!auth) return new Response("unauthorized", { status: 401 });
      const { uid, email } = auth;
      const owner = isOwner(email, env);

      if (request.method === "GET") {
        if (!owner) return Response.json({ value: null, updatedAt: null, owner: false });
        const row = await env.DB.prepare("SELECT value, updated_at FROM kv WHERE user_id = ? AND key = ?")
          .bind(uid, key)
          .first();
        return Response.json({
          value: row ? JSON.parse(row.value) : null,
          updatedAt: row ? row.updated_at : null,
          owner: true,
        });
      }

      if (request.method === "PUT") {
        if (!WRITABLE_KEYS.has(key)) return new Response("read only", { status: 405 });
        if (!owner) return Response.json({ ok: false, error: "not-owner" }, { status: 403 });
        const raw = await request.text();
        if (raw.length > MAX_VALUE_BYTES) return new Response("payload too large", { status: 413 });
        let value;
        try {
          value = JSON.parse(raw);
        } catch {
          return new Response("invalid json", { status: 400 });
        }
        await env.DB.prepare(
          "INSERT INTO kv (user_id, key, value, email, updated_at) VALUES (?, ?, ?, ?, datetime('now')) " +
            "ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, email = excluded.email, updated_at = excluded.updated_at"
        )
          .bind(uid, key, JSON.stringify(value), email)
          .run();
        return Response.json({ ok: true });
      }

      return new Response("method not allowed", { status: 405 });
    }

    if (url.pathname.startsWith("/api/")) return new Response("not found", { status: 404 });

    return env.ASSETS.fetch(request);
  },
};
