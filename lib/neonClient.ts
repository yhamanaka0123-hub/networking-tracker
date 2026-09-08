"use client";

import { createClient } from "@neondatabase/neon-js";

const authUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL;
const dataApiUrl = process.env.NEXT_PUBLIC_NEON_DATA_API_URL;

if (!authUrl || !dataApiUrl) {
  throw new Error(
    "NEXT_PUBLIC_NEON_AUTH_URL and NEXT_PUBLIC_NEON_DATA_API_URL must be set (see .env.example).",
  );
}

// Two-URL object form: separate Auth and Data API endpoints. This is the
// only Neon client the frontend uses, for both authentication (sign up/in/
// out, session) and reading contacts straight from the Data API, which is
// safe because Row Level Security scopes every read to the caller's rows.
export const neon = createClient({
  auth: { url: authUrl },
  dataApi: { url: dataApiUrl },
});
