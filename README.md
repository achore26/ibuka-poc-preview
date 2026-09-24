# Daraja — IBUKA Phase 1 staging frontend

**Daraja** is the confirmed working product name (Barak, 23 September 2026) for the IBUKA
Phase 1 proof of concept, with the line **"Bridging business and capital"**. This private
KASIB repository holds the static frontend that builds to `dist/` for the KASIB
Cloudflare Worker `ibuka-poc` (Workers Builds with static assets). `ibuka-poc` remains
the working repository name; IBUKA remains the project context.

This repository is currently the **B04 staging foundation only**:

| Area | Status |
| --- | --- |
| Static staging shell (Vite + React + TypeScript) | Implemented |
| Daraja editorial visual identity (Tailwind CSS v4 + shadcn/ui Button and Card) | Implemented (this revision) |
| Read-only Supabase connectivity diagnostic | Implemented (reachability only) |
| Company registration / magic-link sign-in | Not implemented |
| Sample Market listing assessment | Not implemented (being prepared; no questions seeded) |
| Readiness scoring / dashboard | Not implemented |

No feature on the page collects company information or produces results.

## Requirements

- Node.js ≥ 18 for the pinned packages; use Node.js 22 for local and Workers Builds builds. Check the existing build image before setting `NODE_VERSION`.
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
build variables in the Cloudflare Workers Builds settings for deployments. These are the
**only** variables this app reads.

| Variable | Purpose | Visibility |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Public Supabase project URL, e.g. `https://<ref>.supabase.co` | Public (embedded in the bundle) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key | Public (embedded in the bundle) |

Both values are browser-safe by design, but they must still be the **publishable pair
only**. Never place the Supabase service-role key, database password, SMTP credentials or
provider tokens in `.env`, the Cloudflare build variables, or any file in this repository — see the
architecture boundary in `AGENTS.md`. The database, not this frontend, enforces company
ownership and row-level security.

`VITE_SUPABASE_URL` must use `https://`. Any other scheme reports "Not configured", with
one narrow exception: plain `http://` is accepted for `localhost`/loopback addresses so a
local Supabase dev stack can be used during development. The publishable key is therefore
never sent to a non-TLS origin outside the developer machine.

## Visual identity and styling

The page uses an editorial Daraja identity defined in `src/index.css` as a Tailwind CSS v4
CSS-first theme: warm off-white paper, deep ink, and a single accent (a fired-brick
terracotta) reserved for the tagline, the bridge-motif water line, phase numerals in
preparation, focus rings and the primary button. Typography uses local font stacks only
(an `Iowan Old Style`/Palatino/Georgia serif stack for display text, system sans for body,
system mono for meta labels) — **no font or asset is fetched from any CDN or external
origin at runtime**. The bridge elevation under the masthead and the favicon are
repo-native inline SVG.

Interactive/accessibility primitives come from **shadcn/ui** via the official CLI
(`components.json`, `style: radix-nova`): exactly two components are vendored into
`src/components/ui/` — `button.tsx` and `card.tsx` — and both are used by `src/App.tsx`.
No other shadcn components, icon library or font package is installed. Keeping the
components in-repo is the documented shadcn model: they are plain source you own and
style through the theme tokens.

`src/config.ts` and `src/lib/supabase-status.ts` are unchanged by the visual revision.

## Cloudflare Workers Builds settings (client-created Worker; operator-managed settings)

The staging host is the client-created Worker **`ibuka-poc`**; the client confirms
`ibuka.co.ke` is already attached as a Custom Domain and the Cloudflare zone is Active.
The resources remain client-created and owned — do not provision or recreate them — and
the client has authorised the project operator to update the existing Worker's build
settings and retry deployments. The build/deploy commands and build variables live in
the Cloudflare dashboard; the Custom Domain route is declared in `wrangler.jsonc` in
this repository.

- **Committed Wrangler config:** `wrangler.jsonc` — `name: ibuka-poc`,
  `compatibility_date: 2026-09-24`, `assets.directory: ./dist`, `keep_vars: true`, and
  the Custom Domain route declared as code:
  `routes: [{ "pattern": "ibuka.co.ke", "custom_domain": true }]`. The pattern is the
  whole hostname with no path — a Custom Domain matches all paths of that exact hostname
  (`www.ibuka.co.ke` would be a separate hostname). Static-assets-only: no Worker
  script, no path routes, no vars or secrets. `"keep_vars": true` preserves
  dashboard-configured plain variables, which a deploy would otherwise delete as the
  config's source of truth (encrypted secrets are never deleted by a deploy); the
  existing settings cannot be inspected from here. Cloudflare syncs the declared
  Custom Domain at deploy. The config does not assert the `*.workers.dev` URL state
  (neither enabled nor disabled); none is claimed. The Custom Domain and Active zone
  are user-confirmed — the actual Cloudflare deploy and live page remain unobserved.
- **Build command (dashboard setting, user-confirmed by screenshot):** `npm run build`.
  This must stay in the dashboard: Workers Builds does not honor build commands from
  the Wrangler config, and the route in `wrangler.jsonc` is not a way to set the build
  command.
- **Deploy command (dashboard setting, user-confirmed by screenshot):**
  `npx wrangler deploy`.
- **Build variables:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (public;
  inlined at build time). Use `NODE_VERSION=22` if the build image does not already
  provide a compatible Node 22 version.
- The client confirms `ibuka.co.ke` is already a Custom Domain on the Worker and the
  zone is Active; the actual Cloudflare deploy and live serving are still unobserved,
  so no live-URL claim is made here. The email sender is not yet selected.

### Why the first build failed (observed on commit `f0ae346`)

Workers Builds ran `npx wrangler deploy` with no Wrangler config committed and no
separately executed `npm run build` step (the log went straight from dependency install
to deploy). With no config, Wrangler attempted automatic framework setup, detected
Vite 5.4.21 and stopped: `The version of Vite used in the project ("5.4.21") cannot be
automatically configured. Please update the Vite version to at least "6.0.0" and try
again.` Automatic setup supports only Vite ≥ 6. Committing `wrangler.jsonc` prevents
automatic framework setup entirely: with an explicit config and an explicit dashboard
build command of `npm run build`, the Vite 5 output in `dist/` is uploaded as plain
static assets and no framework detection runs, so no Vite upgrade is needed. Whether the
retried Cloudflare build actually succeeds is **not yet observed**.

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

1. Open the staging URL: the page shows the **Daraja** heading and tagline, and says the sample assessment is still being prepared. View-source confirms
   `<title>Daraja · IBUKA Phase 1 (staging)</title>` and `<meta name="robots" content="noindex">`.
2. **Primary revision check:** in the Cloudflare Workers dashboard, record the
   deployment's revision metadata — deployment ID and the linked commit SHA — when
   available. That metadata, not a local artifact, identifies what was actually deployed.
3. **Optional local cross-check:** the served bundle hash (e.g. `assets/index-<hash>.js`)
   matches a local `npm run build` output **only when the build inputs match**: the same
   code revision *and* the same public environment values, because Vite inlines `VITE_`
   variables into the bundle at build time. A differing hash may reflect environment values or other build inputs; compare like with like.
4. Inspect the served bundle: no `eyJ…` (JWT-like) strings, no service-role material.
   Note: a build produced **without** the `VITE_` variables set contains no `/auth/v1/health`
   string at all — Vite inlines the unset values as `undefined` and the minifier then folds
   the check to the honest static "Not configured" result. The fetch path
   (`/auth/v1/health`, `apikey` header, `cache: "no-store"`) is only present in builds
    where the public values were provided at build time, which is the case for
    Workers Builds deployments that set the variables.
5. In the visible **Service diagnostics** card, choose **Run connectivity check**:
   - Build variables set → "Reachable — HTTP 200".
   - Variables missing → "Not configured" (page still renders normally).
6. With the public values configured, optionally run the `curl` above from a terminal and record its actual status (a healthy endpoint normally returns `200`).

## Known limits (this revision)

- Single static page; no routing, no sign-in, no assessment, scoring or dashboard code.
- The shadcn/ui surface is deliberately limited to `Button` and `Card`; adding more
  components is a reviewed decision, not a default.
- Visual acceptance is manual (browser review); there are no visual-regression tests.
- No automated tests yet; acceptance is the command sequence and checks above.
- Cloudflare Workers Builds on the connected repository is the CI/deployment path; there
  are no repo-managed GitHub Actions workflows.
- The connectivity check is a diagnostic, not an access-control or tenant-isolation test.
- The `ibuka.co.ke` Custom Domain and Active zone are user-confirmed; deploy and live
  serving are unobserved, and the page remains `noindex`. The email sender is unconfirmed.

## Project layout

```
index.html                  # document shell (title, meta, noindex)
src/main.tsx                # React entry point
src/App.tsx                 # visible staging page + diagnostics panel
src/index.css               # Tailwind v4 theme: Daraja editorial tokens and fonts
src/config.ts               # public runtime config reader (URL/key presence only)
src/lib/supabase-status.ts  # read-only connectivity check
src/components/ui/button.tsx  # shadcn/ui Button (official CLI copy, MIT-derived)
src/components/ui/card.tsx    # shadcn/ui Card (official CLI copy, MIT-derived)
src/vite-env.d.ts           # typed import.meta.env for the two public variables
components.json             # shadcn CLI configuration (radix-nova, css variables)
public/favicon.svg          # bridge mark (paper, ink, terracotta water line)
.env.example                # placeholders for the two public variables
```

## Dependency and licence inventory

Direct dependencies, with licences read from each installed package's own declared
`license` field at the pinned version in `package-lock.json` (all versions are pinned
exactly, no ranges):

| Package | Version | Declared licence | Role |
| --- | --- | --- | --- |
| `react` | 18.3.1 | MIT | UI runtime |
| `react-dom` | 18.3.1 | MIT | React DOM renderer |
| `tailwindcss` | 4.3.3 | MIT | Utility CSS engine (v4, CSS-first theme) |
| `@tailwindcss/vite` | 4.3.3 | MIT | Tailwind v4 Vite plugin |
| `class-variance-authority` | 0.7.1 | Apache-2.0 | Button variant typing (shadcn) |
| `cn` | 0.4.0 | MIT | Class-name merge utility used by the shadcn components |
| `radix-ui` | 1.6.7 | MIT | Provides `Slot` for the Button `asChild` prop |
| `typescript` | 5.6.3 | Apache-2.0 | Type checking (`tsc --noEmit`) |
| `vite` | 5.4.21 | MIT | Build tool and dev/preview server |
| `@vitejs/plugin-react` | 4.3.4 | MIT | Vite ↔ React integration |
| `@types/react` | 18.3.12 | MIT | Type definitions |
| `@types/react-dom` | 18.3.1 | MIT | Type definitions |

`src/components/ui/button.tsx` and `src/components/ui/card.tsx` are derived from the
MIT-licensed shadcn/ui component source as fetched by the official CLI; per shadcn's
model they are owned code in this repository.

The full installed tree (157 packages, including transitive dependencies pinned in
`package-lock.json`) declares only permissive licences — MIT (142), ISC (6), Apache-2.0
(4), MPL-2.0 (2, both `lightningcss`, pulled in by Tailwind v4), CC-BY-4.0 (1),
BSD-3-Clause (1) and 0BSD (1) at the time this inventory was generated. No transitive
licence audit beyond those declarations has been performed and no deeper claim is made.

This repository's own code is private KASIB property; no open-source licence is granted
for it.

## Known security advisories in the toolchain

`npm audit` reports two entries against the development toolchain: the Vite dev-server
advisories (GHSA-4w7w-66w2-5vf9, GHSA-v6wh-96g9-6wx3, GHSA-fx2h-pf6j-xcff) and the
esbuild dev-server advisory (GHSA-67mh-4wv8-2f99) that Vite 5.x depends on. Vite was
pinned to **5.4.21** (the patched 5.x version npm suggested within the existing major),
but 5.4.21 still resolves `esbuild ^0.21` and still falls inside the
advisory ranges above; the only version npm can resolve as fully patched is
**vite 8.3.0, a breaking major upgrade**. The affected surfaces are development-server behaviours (optimised-deps `.map` path traversal,
`server.fs.deny` bypasses), not the static production output in `dist/`. Upgrading Vite
majors is deliberately left to a dedicated future change; until then, run
`npm run dev` only on a trusted machine. This is a reported, unresolved status — not a
claim that the advisories are harmless.

`@tailwindcss/vite` declares Vite as a peer dependency, so `npm audit --omit=dev` still
reports this build-tooling chain. Vite is not imported into the browser bundle.
