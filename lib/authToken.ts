"use client";

const authUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL;

let cached: { token: string; expiresAt: number } | null = null;

// Our backend (app/api/contacts/*) can't rely on the Better Auth session
// cookie: it's scoped to the Auth service's own origin, not ours. Instead
// we fetch a short-lived JWT directly from the Auth service (same-origin as
// its cookie) and send it as a Bearer token on our own API calls; the
// backend verifies it against the Auth service's JWKS (lib/session.ts).
export async function getAccessToken(): Promise<string | null> {
  if (!authUrl) return null;
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const res = await fetch(`${authUrl}/get-session`, { credentials: "include" });
  if (!res.ok) return null;

  const token = res.headers.get("set-auth-jwt");
  if (!token) return null;

  // Cache for well under the token's real lifetime (~15 min) so we don't
  // hand a soon-to-expire token to a request that's about to run.
  cached = { token, expiresAt: Date.now() + 60_000 };
  return token;
}

export function clearAccessTokenCache() {
  cached = null;
}
