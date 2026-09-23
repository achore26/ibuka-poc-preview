# Daraja — IBUKA Phase 1 staging frontend

**Daraja** is the confirmed working product name (Barak, 23 September 2026) for the IBUKA
Phase 1 proof of concept, with the line **"Bridging business and capital"**. This private
KASIB repository holds the static frontend that builds to `dist/` for KASIB Cloudflare
Pages. `ibuka-poc` remains the working repository name; IBUKA remains the project context.

This repository is currently the **B04 staging foundation only**:

| Area | Status |
| --- | --- |
| Static staging shell (Vite + React + TypeScript) | Implemented (this revision) |
| Read-only Supabase connectivity diagnostic | Implemented (reachability only) |
| Company registration / magic-link sign-in | Not implemented |
| Sample Market listing assessment | Not implemented (being prepared; no questions seeded) |
| Readiness scoring / dashboard | Not implemented |

No feature on the page collects company information or produces results.

## Requirements

- Node.js ≥ 18 (20 LTS recommended). Set `NODE_VERSION` in Cloudflare Pages accordingly.
- npm (a lockfile, `package-lock.json`, is committed; installs must use it).

## Commands

```bash
npm ci            # clean install exactly from package-lock.json
npm run dev       # local dev server with hot reload
npm run build     # typecheck (tsc --noEmit) + production build to dist/
npm run preview   # serve the built dist/ locally at http://localhost:4173
```

`npm run build` produces `dist/index.html` plus hashed assets in `dist/assets/`. A missing
environment does **not** break the build: unset variables simply leave the connectivity
diagnostic in the "Not configured" state at runtime.

## Environment variables

Copy `.env.example` to `.env` (git-ignored) for local development; set the same names as
variables in the Cloudflare Pages project for deployments. These are the **only** variables
this app reads.

| Variable | Purpose | Visibility |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Public Supabase project URL, e.g. `https://<ref>.supabase.co` | Public (embedded in the bundle) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key | Public (embedded in the bundle) |

Both values are browser-safe by design, but they must still be the **publishable pair
only**. Never place the Supabase service-role key, database password, SMTP credentials or
provider tokens in `.env`, Pages variables, or any file in this repository — see the
architecture boundary in `AGENTS.md`. The database, not this frontend, enforces company
ownership and row-level security.

`VITE_SUPABASE_URL` must use `https://`. Any other scheme reports "Not configured", with
one narrow exception: plain `http://` is accepted for `localhost`/loopback addresses so a
local Supabase dev stack can be used during development. The publishable key is therefore
never sent to a non-TLS origin outside the developer machine.

## Cloudflare Pages settings (client-created project — do not recreate or mutate from here)

- **Framework preset:** None (plain Vite output works)
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Environment variables:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (and
  `NODE_VERSION=20`)
- The staging URL is a temporary provider URL until the client selects a name/domain and
  email sender.

## Supabase connectivity check

`src/lib/supabase-status.ts` performs a read-only `GET {VITE_SUPABASE_URL}/auth/v1/health`
with the publishable key sent as the `apikey` header. It is exposed in the page under
**"Service diagnostics (staging team)"** and reports exactly one status:

| Status | Meaning |
| --- | --- |
| Reachable — HTTP *n* | The public API answered with the observed 2xx status |
| Not configured | One or both public values are missing, or the URL is not HTTPS |
| Unreachable | No response (network/DNS failure, paused project) |
| Unexpected response — HTTP *n* | The endpoint answered with a non-2xx status |

The check never displays the key, tokens or response bodies. It reports the observed
response and network reachability only. The auth health endpoint may respond without
validating the publishable key, so a 2xx does not confirm that the URL and key belong to
the same project; the check verifies nothing about key validity, authentication, company
(tenant) isolation, or row-level security. Optional command-line equivalent (prints only the status code):

```bash
curl -s -o /dev/null -w '%{http_code}\n' "$VITE_SUPABASE_URL/auth/v1/health" \
  -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY"
```

## Verifying a deployed revision

1. Open the staging URL: the page shows the **Daraja** heading, the tagline, and "The
   sample assessment is being prepared". View-source confirms
   `<title>Daraja · IBUKA Phase 1 (staging)</title>` and `<meta name="robots" content="noindex">`.
2. **Primary revision check:** in the Cloudflare Pages dashboard, record the deployment's
   revision metadata — deployment ID and the linked commit SHA — when available. That
   metadata, not a local artifact, identifies what was actually deployed.
3. **Optional local cross-check:** the served bundle hash (e.g. `assets/index-<hash>.js`)
   matches a local `npm run build` output **only when the build inputs match**: the same
   code revision *and* the same public environment values, because Vite inlines `VITE_`
   variables into the bundle at build time. A differing hash with matching code means the
   environment values differ; compare like with like.
4. Inspect the served bundle: no `eyJ…` (JWT-like) strings, no service-role material.
5. Expand **Service diagnostics** → **Run connectivity check**:
   - Pages variables set → "Reachable — HTTP 200".
   - Variables missing → "Not configured" (page still renders normally).
6. Optionally run the `curl` above from a terminal; expect `200`.

## Known limits (this revision)

- Single static page; no routing, no sign-in, no assessment, scoring or dashboard code.
- No automated tests yet; acceptance is the command sequence and checks above.
- No CI pipeline; builds are run locally or by Cloudflare Pages.
- The connectivity check is a diagnostic, not an access-control or tenant-isolation test.
- Staging uses a temporary provider URL and `noindex` until the client confirms naming.

## Project layout

```
index.html                  # document shell (title, meta, noindex)
src/main.tsx                # React entry point
src/App.tsx                 # visible staging page + diagnostics panel
src/index.css               # styling
src/config.ts               # public runtime config reader (URL/key presence only)
src/lib/supabase-status.ts  # read-only connectivity check
src/vite-env.d.ts           # typed import.meta.env for the two public variables
public/favicon.svg          # bridge mark
.env.example                # placeholders for the two public variables
```

## Dependency and licence inventory

Direct dependencies, with licences read from each installed package's own declared
`license` field at the pinned version in `package-lock.json`:

| Package | Version | Declared licence | Role |
| --- | --- | --- | --- |
| `react` | 18.3.1 | MIT | UI runtime |
| `react-dom` | 18.3.1 | MIT | React DOM renderer |
| `typescript` | 5.6.3 | Apache-2.0 | Type checking (`tsc --noEmit`) |
| `vite` | 5.4.11 | MIT | Build tool and dev/preview server |
| `@vitejs/plugin-react` | 4.3.4 | MIT | Vite ↔ React integration |
| `@types/react` | 18.3.12 | MIT | Type definitions |
| `@types/react-dom` | 18.3.1 | MIT | Type definitions |

The full installed tree (67 packages, including transitive dependencies pinned in
`package-lock.json`) declares only permissive licences — MIT (58), ISC (5), Apache-2.0 (2),
BSD-3-Clause (1) and CC-BY-4.0 (1) at the time this inventory was generated. No transitive
licence audit beyond those declarations has been performed and no deeper claim is made.

This repository's own code is private KASIB property; no open-source licence is granted
for it.
