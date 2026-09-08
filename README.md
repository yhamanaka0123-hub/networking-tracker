# Networking Tracker

A small, secure app for tracking professional contacts: who you met, their
priority, and notes — scoped so each signed-in user only ever sees their own
data. Built on Next.js, Neon Postgres, Managed Better Auth, and the Neon
Data API.

## Setup

### Prerequisites

- Node.js 22+
- A Neon project with a `neon.ts` already declaring `auth: true` and
  `dataApi: true` (see [`neon.ts`](./neon.ts)), linked via `neon link`.

### Install and configure

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local` from your linked branch's env (`neon deploy` or
`neon env pull` writes `DATABASE_URL`, `DATABASE_URL_UNPOOLED`,
`NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL`, and `NEON_DATA_API_URL` — copy
`NEON_AUTH_BASE_URL` into `NEXT_PUBLIC_NEON_AUTH_URL`, `NEON_DATA_API_URL`
into `NEXT_PUBLIC_NEON_DATA_API_URL`, and keep `NEON_AUTH_JWKS_URL` as-is).
Note that `neon deploy` / `neon env pull` will overwrite `.env.local` with
the raw `NEON_*` names again on a future run — re-copy the two
`NEXT_PUBLIC_` mirrors afterward.

Allow local sign-in/sign-up during development (Neon Auth only accepts
requests from trusted origins):

```bash
neon neon-auth domain allow-localhost enable
```

### Apply the schema

```bash
npm run db:migrate
```

Applies [`db/schema.sql`](./db/schema.sql) — the `contacts` table, RLS, and
grants — to the linked branch via `DATABASE_URL_UNPOOLED`. Safe to re-run.

### Run it

```bash
npm run dev
```

Open http://localhost:3000, sign up, and start adding contacts.

## Architecture

One Next.js (App Router, TypeScript) app, deployed as a single Vercel
project, with a clear frontend/backend split inside it:

```
Browser (React) ──reads (list/sort/filter)──▶ Neon Data API ──▶ Postgres (RLS-gated)
      │                                                              ▲
      │ writes (create/edit/delete), Bearer JWT                     │
      ▼                                                              │
Next.js Route Handlers (app/api/contacts/*) ──validated writes───────┘
      │ verifies JWT via JWKS               (parameterized SQL, pg)
      ▼
Neon Auth JWKS (NEON_AUTH_JWKS_URL)
```

- **Frontend** (`app/`, `components/`) — sign up/in/out and session state,
  plus **reads** (list, sort, filter), all done directly against the Neon
  Data API from the browser via `@neondatabase/neon-js`'s two-URL object
  form (`lib/neonClient.ts`):
  ```ts
  createClient({
    auth: { url: NEXT_PUBLIC_NEON_AUTH_URL },
    dataApi: { url: NEXT_PUBLIC_NEON_DATA_API_URL },
  });
  ```
  Row Level Security is what makes reading straight from the browser safe:
  a signed-in user's token only ever matches `auth.user_id() = user_id`
  rows.

- **Backend** (`app/api/contacts/route.ts`, `app/api/contacts/[id]/route.ts`)
  — **all writes** (create, edit, delete). Each handler:
  1. Reads the caller's `Authorization: Bearer <jwt>` header and verifies
     it locally against Neon Auth's JWKS (`lib/session.ts`, using `jose`) —
     the same trust boundary the Data API itself uses. The verified
     `sub` claim is the real user id; nothing from the request body is
     ever trusted for identity.
  2. Validates the body with a shared Zod schema (`lib/contactSchema.ts`)
     — required `name`, `priority` restricted to `low | medium | high`.
  3. Runs a parameterized query via `pg` (`lib/db.ts`) against the pooled,
     **server-only** `DATABASE_URL`, explicitly scoping every
     `UPDATE`/`DELETE` with `WHERE user_id = $verifiedId`. This connection
     is the Postgres owner role, which bypasses RLS by default — the
     backend enforces ownership itself here, and RLS remains the real
     gate for the separate Data API path the browser uses.

  **Why a Bearer JWT and not the session cookie:** Managed Better Auth's
  session cookie is scoped to the Auth service's own origin
  (`*.neonauth.*.neon.tech`), not this app's origin, so it never reaches
  these Route Handlers. Instead the frontend (`lib/authToken.ts`) fetches a
  short-lived JWT directly from the Auth service
  (`GET {authUrl}/get-session`, reading the `set-auth-jwt` response header
  — same-origin as that cookie) and sends it as a Bearer token on every
  call to our own API.

- **Database** (`db/schema.sql`) — see [Schema](#schema) below.

**Why writes don't also go through the Data API:** the browser client's
automatic token injection is designed for the browser's own requests, and
forwarding that same token into a second, server-side Data API client
isn't a documented pattern for the current (beta) SDK. Routing writes
through our own Route Handlers is simpler, still fully secure (RLS still
gates the Data API for any other caller, and did in testing — see
[Security](#security)), and is the natural "backend logic" half of the
split.

## Schema

```sql
CREATE TABLE contacts (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL DEFAULT auth.user_id(),
  name text NOT NULL CHECK (btrim(name) <> ''),
  company text,
  role text,
  email text,
  phone text,
  notes text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

Full file, including RLS policies and grants: [`db/schema.sql`](./db/schema.sql).

- `user_id` defaults to `auth.user_id()` (the caller's verified id from
  their Data API JWT) — used when a Data API caller inserts without
  specifying it.
- `name` and `priority` are validated at the database level regardless of
  access path (see [Security](#security)).
- `created_at` / `updated_at` are set by the app (no trigger); the backend
  sets `updated_at = now()` on every edit.

## Security

- **Row Level Security.** `contacts` has RLS enabled with four ownership
  policies (`select`, `insert`, `update`, `delete`), each
  `USING (auth.user_id() = user_id)`, and `insert`/`update` additionally
  `WITH CHECK (auth.user_id() = user_id)` — so a caller can't even insert
  or retarget a row to someone else's `user_id`. Verified directly: a
  second test user got `[]` from a list call, a `404` attempting to edit
  or delete the first user's contact through the backend, and a `403
  row-level security policy` violation attempting to insert a row with a
  forged `user_id` straight against the Data API.
- **Required-field and priority validation, in two independent layers:**
  - *Trusted server code* — `lib/contactSchema.ts` (Zod), enforced in the
    Route Handlers before any write, returning clear `400` errors.
  - *Trusted database code* — `NOT NULL` / `CHECK` constraints in
    `db/schema.sql`. This is the layer that actually can't be bypassed:
    the Data API is a public REST endpoint reachable directly by anyone
    holding a valid session token, entirely outside our Next.js server.
    Verified directly: a raw Data API insert with `priority: "urgent"` or
    a blank `name` was rejected with Postgres error `23514` (check
    constraint violation), independent of the Zod layer.
- **Identity is never trusted from client input.** The backend derives the
  acting user id by cryptographically verifying the caller's JWT against
  Neon Auth's JWKS (`lib/session.ts`); it never reads a `user_id` field
  from a request body.
- **Secrets stay server-only.** `DATABASE_URL` and `DATABASE_URL_UNPOOLED`
  are read only in `lib/db.ts` and `scripts/migrate.mjs`, never prefixed
  `NEXT_PUBLIC_`, and `.env.local` is gitignored. The two `NEXT_PUBLIC_*`
  values (Auth and Data API URLs) and the JWKS URL are not secrets — they're
  the same kind of public endpoint identifiers Neon documents for direct
  HTTP/Data API use — but `NEON_AUTH_JWKS_URL` is still kept server-only
  since only the backend needs it.
- `.env.example` contains placeholder values only.

## Testing

```bash
npm test
```

Runs [`tests/contactSchema.test.ts`](./tests/contactSchema.test.ts) (Vitest)
against the shared Zod schema: accepts valid input, rejects a missing or
whitespace-only `name`, rejects an invalid `priority`, and rejects a
missing `priority`. This is the same schema the API routes import, so it
covers the actual validation logic rather than a reimplementation of it.

The full read/write/RLS/JWT flow was additionally exercised end-to-end by
hand against the live Neon branch (sign-up, JWT retrieval, create/list
/sort/filter/edit/delete, and the cross-user isolation cases above) — see
[Security](#security) for what those runs confirmed.

## Deployment (Vercel)

**Currently deployed at:**
- https://networking-tracker-fawn.vercel.app
- https://networking-tracker-yukahamanaka-2562s-projects.vercel.app

(Project `yukahamanaka-2562s-projects/networking-tracker`; both domains are
stable production aliases Vercel assigned and both are registered as
trusted Neon Auth origins.)

To deploy (or redeploy) yourself:

1. `vercel link` the project (or push to GitHub and import it in the
   Vercel dashboard).
2. Set the production environment variables — `DATABASE_URL` and
   `DATABASE_URL_UNPOOLED` as **Secret** (`--sensitive` / mark sensitive in
   the dashboard), `NEXT_PUBLIC_NEON_AUTH_URL` and
   `NEXT_PUBLIC_NEON_DATA_API_URL` as **Config** (Vercel will refuse a bare
   `NEXT_PUBLIC_` add if the value looks credential-shaped — that's
   expected; these two are intentionally public endpoint URLs, so pass
   `--type config`), and `NEON_AUTH_JWKS_URL`:
   ```bash
   vercel env add DATABASE_URL production --sensitive
   vercel env add DATABASE_URL_UNPOOLED production --sensitive
   vercel env add NEXT_PUBLIC_NEON_AUTH_URL production --type config
   vercel env add NEXT_PUBLIC_NEON_DATA_API_URL production --type config
   vercel env add NEON_AUTH_JWKS_URL production
   ```
3. `vercel deploy --prod`. Vercel auto-detects Next.js and runs
   `next build` / serves with `next start` — no custom build config
   needed.
4. Trust the resulting domain(s) with Neon Auth, or sign-in/sign-up will
   fail with an `invalid domain` error (check all aliases Vercel assigns —
   `vercel inspect <deployment-url>` lists them — not just the one printed
   as "Production"):
   ```bash
   neon neon-auth domain add https://your-app.vercel.app
   ```
   Repeat for any custom domain and for preview deployment URLs you use.
5. If you deploy a different Neon branch per Vercel environment (e.g. a
   preview branch per PR), re-run `npm run db:migrate` against that
   branch's `DATABASE_URL_UNPOOLED` before traffic hits it.

**Gotcha hit during this deployment:** `neon.ts` imports
`@neon/config/v1`. Locally that package can be present in `node_modules`
from having run the Neon CLI's `neon config init` without ever being added
to `package.json` — `next build`'s type-check then silently passes locally
(and can even keep passing off a stale `tsconfig.tsbuildinfo` after the
package is gone) but fails on Vercel's clean checkout with
`Cannot find module '@neon/config/v1'`. Fix: `@neon/config` is listed as a
real `devDependency` here (see `package.json`) — if you regenerate
`neon.ts` from scratch elsewhere, make sure `@neon/config` is an actual
project dependency, not just a global/ambient install.

## Project layout

```
app/
  page.tsx                 Session-gated entry: sign-in/up panel or the app
  api/contacts/route.ts    POST — create (backend)
  api/contacts/[id]/route.ts  PATCH/DELETE — edit, delete (backend)
components/                 Frontend: auth panel, contact list/form, sort/filter bar
lib/
  neonClient.ts             Browser Neon client (auth + Data API reads)
  authToken.ts               Fetches/caches the Bearer JWT for backend calls
  session.ts                 Backend: verifies that JWT via JWKS
  contactSchema.ts           Shared Zod validation (client + backend)
  db.ts                      Server-only pg pool
db/schema.sql                Table, RLS policies, grants
scripts/migrate.mjs          Applies db/schema.sql
tests/contactSchema.test.ts  Automated test
```
