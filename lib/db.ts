import "server-only";
import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";

// Server-only Postgres pool. DATABASE_URL never reaches the browser bundle
// because this file imports "server-only" and is only ever imported from
// Route Handlers.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set (see .env.example).");
}

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

export const pool = globalThis.__pgPool ?? new Pool({ connectionString });
if (process.env.NODE_ENV !== "production") {
  globalThis.__pgPool = pool;
}

// Lets Vercel's Fluid compute keep this pool alive across invocations
// instead of closing it when the function returns.
attachDatabasePool(pool);
