// Applies db/schema.sql to the branch pointed to by DATABASE_URL_UNPOOLED.
// Run with `npm run db:migrate`. Uses the direct (unpooled) connection
// because schema changes need session-level behavior a pooled connection
// doesn't reliably support.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Client } from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  let contents;
  try {
    contents = readFileSync(envPath, "utf8");
  } catch {
    return;
  }
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

const connectionString = process.env.DATABASE_URL_UNPOOLED;
if (!connectionString) {
  console.error(
    "DATABASE_URL_UNPOOLED is not set. Run `neon deploy` or `neon env pull` first.",
  );
  process.exit(1);
}

const sql = readFileSync(path.join(__dirname, "..", "db", "schema.sql"), "utf8");

const client = new Client({ connectionString });

try {
  await client.connect();
  await client.query(sql);
  console.log("Schema applied successfully.");
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
