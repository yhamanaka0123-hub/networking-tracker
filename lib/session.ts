import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";

const authBaseUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL;
const jwksUrl = process.env.NEON_AUTH_JWKS_URL;

if (!authBaseUrl || !jwksUrl) {
  throw new Error(
    "NEXT_PUBLIC_NEON_AUTH_URL and NEON_AUTH_JWKS_URL must be set (see .env.example).",
  );
}

// The browser's Better Auth session cookie is scoped to the Auth service's
// own origin, not ours, so it never reaches these Route Handlers. Instead
// the frontend sends a short-lived JWT (obtained from the Auth service's
// `/get-session`, same mechanism the Data API itself relies on) as a Bearer
// token, and we verify it ourselves against the Auth service's public keys
// — the same trust boundary the Data API uses for `auth.user_id()`.
const jwks = createRemoteJWKSet(new URL(jwksUrl));
// Neon issues `iss`/`aud` as the Auth service's origin, not the full
// `/<db>/auth` base URL.
const authOrigin = new URL(authBaseUrl).origin;

export type VerifiedUser = { id: string };

export async function getVerifiedUser(request: Request): Promise<VerifiedUser | null> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: authOrigin,
      audience: authOrigin,
    });
    return typeof payload.sub === "string" ? { id: payload.sub } : null;
  } catch {
    return null;
  }
}
