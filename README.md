# Daraja — IBUKA Phase 1 staging frontend

**Daraja** is the confirmed working product name (Barak, 23 September 2026) for the IBUKA
Phase 1 proof of concept, with the line **"Bridging business and capital"**. This private
KASIB repository holds the static frontend that builds to `dist/` for the KASIB
Cloudflare Worker `ibuka-poc` (Workers Builds with static assets). `ibuka-poc` remains
the working repository name; IBUKA remains the project context.

This repository is currently the **B04 staging foundation plus a demo-only review preview**:

| Area | Status |
| --- | --- |
| Static staging shell (Vite + React + TypeScript) | Implemented |
| Daraja editorial visual identity (Tailwind CSS v4 + shadcn/ui Button and Card) | Implemented |
| Read-only Supabase connectivity diagnostic | Implemented (reachability only) |
| Sample assessment **review preview** (four proposed fields, in-memory demo state, live self-reported sample progress) | Implemented (this revision) — demo only, not validated, not saved |
| Company registration / magic-link sign-in | Not implemented (B05, pending) |
| Saved sample assessment (real entries, save/resume) | Not implemented — depends on C03 validation and B05 sign-in |
| Readiness scoring / dashboard (saved, company-scoped) | Not implemented |

The review preview runs entirely in the page with placeholder demo entries: nothing is
persisted, no storage or cookies are used, no API writes occur, and answers reset on
reload. It is labelled as a proposal awaiting validation and produces no regulatory,
listing-eligibility or approval finding.

## Requirements

- Node.js ≥ 18 for the pinned packages; use Node.js 22 for local and Workers Builds builds. Check the existing build image before setting `NODE_VERSION`.
- npm (a lockfile, `package-lock.json`, is committed; installs must use it).

## Commands

```bash
npm ci            # clean install exactly from package-lock.json
npm run dev       # local dev server with hot reload
npm run build     # typecheck (tsc --noEmit) + production build to dist/
npm run preview   # serve the built dist/ locally at http://localhost:4173
npm test          # built-in Node fixtures for the pure sample-progress calculator
```

`npm test` runs `src/lib/sample-progress.test.ts` directly on Node's TypeScript
type-stripping (no test framework is imported; no new packages). Use Node ≥ 22.18
or ≥ 23.6 (type stripping without a flag); Node 22.6–22.17 also works because the
script passes `--experimental-strip-types`. The file is also typechecked by
`npm run build`.

`npm run build` produces `dist/index.html` plus hashed assets in `dist/assets/`. A missing
environment does **not** break the build: unset variables simply leave the connectivity
diagnostic in the "Not configured" state at runtime.

## Environment variables

The two public Supabase values are now **versioned as `vars` in `wrangler.jsonc`**
(the repo JSON is their source of truth; both are public by design). A minimal
bridge in `vite.config.ts` — `loadEnv` plus `process.env`, no new dependency —
feeds them into the Vite build with this precedence, highest first:

1. Existing `process.env` values (Cloudflare Workers Builds **Build variables**,
   or shell exports) — optional overrides
2. Vite `.env` files such as a git-ignored `.env.local` — optional local overrides
3. `wrangler.jsonc` `vars` defaults — the committed values

| Variable | Purpose | Visibility |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Public Supabase project URL, e.g. `https://<ref>.supabase.co` | Public (committed in `wrangler.jsonc`, embedded in the bundle) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key | Public (committed in `wrangler.jsonc`, embedded in the bundle) |

Both values are browser-safe by design, but they must still be the **publishable pair
only**. Never place the Supabase service-role key, database password, SMTP credentials
or provider tokens in `wrangler.jsonc`, `.env`, the Cloudflare build variables, or any
file in this repository — see the architecture boundary in `AGENTS.md`. The database,
not this frontend, enforces company ownership and row-level security. Do not duplicate
these values into any other committed location (`.env.production`, app source constants,
GitHub secrets, …).

`VITE_SUPABASE_URL` must use `https://`. Any other scheme reports "Not configured", with
one narrow exception: plain `http://` is accepted for `localhost`/loopback addresses so a
local Supabase dev stack can be used during development. The publishable key is therefore
never sent to a non-TLS origin outside the developer machine. Local `.env` files are now
optional: `npm run dev` and `npm run build` work straight from the `wrangler.jsonc`
defaults. A missing or unreadable value still never breaks the build — the page reports
"Not configured" honestly at runtime.

Note the mechanism split (per the official Cloudflare and Vite docs): Wrangler `vars` are
**runtime** Worker config; the Vite build does not see Wrangler runtime vars or dashboard
Runtime variables — the `vite.config.ts` bridge reads the JSON directly, and only
**Build variables**/`.env` files can override it. This Worker serves static assets only
(no script runs), so runtime vars are inert here anyway.

## Sample assessment review preview (demo only)

`src/components/review-preview.tsx` adds an interactive, clearly labelled **review
preview** of the proposed four-item sample to the homepage, for Trevor to inspect in
the 25 September session. The four-field sample comes from the B02 sample and
acceptance proposal (`docs/sample-and-acceptance.md` in the `ibuka-b02-sample`
worktree) and is an **engineering proposal, not Trevor-approved content** (ClickUp
C03, the scope/scoring confirmation, is still TO DO). The page shows each supplied
ID, the verbatim prompt and the source reference:

| Supplied ID | Prompt (verbatim, shown on the page) | Source shown | Control |
| --- | --- | --- | --- |
| `CP-07` | Date of incorporation | Field Dictionary, Company Profile; First Schedule A.1 / 6th Sch. 3.3 | Date input |
| `Q-DIR-01` | Has any auditor resigned, been removed, or not been reappointed in the last 3 years? If yes, describe the circumstances and any concerns they raised. | Field Dictionary, Narrative Drafting Question Bank; 6th Sch. 1.4 | Yes/No radios + conditional details text when Yes |
| `Q-ISS-01` | Describe the company's principal objects and activities. Are there any government protection or investment-encouragement laws that specifically benefit your business? | Field Dictionary, Narrative Drafting Question Bank; 6th Sch. 3.5 | Narrative textarea |
| `Q-OFR-03` | If applicable to a foreign listing, describe any exchange-traded call option arrangements. | Field Dictionary, Narrative Drafting Question Bank; 6th Sch. 13.25 | Conditional text + the only N/A path |

Behaviour (all transient, in React memory only):

- Each item has an explicit **readiness state** separate from the typed answer:
  `not_started`, `in_progress`, `ready` — plus `na`, offered **only** for
  Q-OFR-03, which requires a recorded non-foreign-listing reason to be valid.
  While the reason is empty the N/A is invalid: it stays in the denominator and
  remains a gap. Other questions cannot be set to N/A at all.
- A recorded **`No` to Q-DIR-01 is a complete answer**; `Yes` requires the
  circumstances/details text. `Ready` is unavailable (radio disabled with an
  explanation) until the typed demo answer is adequate for that field; if the
  answer behind a `ready` item is cleared, the state demotes to `in_progress`.
- Typing into an item that is `not_started` advances it to `in_progress` (a
  partial draft exists).
- The **self-reported sample progress** panel derives live as
  `100 × ready ÷ (4 − valid N/A)`, rounded only for display to two decimals, with
  gaps listed in source order. It is labelled as self-reported progress — **not**
  a regulatory pass/fail result, listing eligibility or approval. No score is
  saved anywhere.
- **Reset demo** restores the initial state; **Load worked example** fills purely
  synthetic values reproducing the B02 fixed case (CP-07 ready, Q-DIR-01 answered
  No and ready, Q-ISS-01 in progress, Q-OFR-03 N/A with reason → `2/3 = 66.67%`,
  Q-ISS-01 the only gap — also covered by the Node fixtures); **reloading the page
  resets everything** (no localStorage/sessionStorage/cookies, no API writes, no
  Supabase data access, no sign-in). Entries are demo placeholders; the page
  asks for no real company data.
- The pure calculation lives in `src/lib/sample-progress.ts` (no React/DOM), with
  Node fixtures in `src/lib/sample-progress.test.ts` covering the B02 fixed
  table: all unanswered (`0/4 = 0.00%`, four ordered gaps), two ready + one in
  progress + valid N/A (`2/3 = 66.67%`, one gap), an invalid N/A that cannot
  shrink the denominator, N/A on an item without an N/A path, the synthetic
  all-N/A ("Not applicable") and empty ("configuration error") cases, and
  display-only rounding.

Remaining dependencies before any real assessment: Trevor's C03 validation of the
sample/wording/scoring, B05 sign-in, and the B06 Supabase data model (company
ownership, RLS). Nothing here should be presented as a saved company record or a
validated regulatory interpretation. The full field dictionary is later scope and
is deliberately not included.



## Visual identity and styling

The page uses an editorial Daraja identity defined in `src/index.css` as a Tailwind CSS v4
CSS-first theme: warm off-white paper, deep ink, and one considered accent — a
KASIB-inspired deep red (`#c82f35`) reserved for the tagline, the bridge-motif water line,
phase numerals in preparation, focus rings and the primary button, with a restrained
muted-gold (`#d0ae56`) keyline along the top of card panels. Both tones are **visually
inferred from the public KASIB site (kasib.co.ke, observed 24 September 2026); they are not
an official KASIB brand specification.** There is no official KASIB logo file; the
repo-native bridge motif and wordmark are retained and no logo is fetched or invented.
The red was verified by WCAG relative-luminance calculation to meet AA for normal text
(>= 4.5:1) both as accent text on the paper background (4.92:1) and as the near-white
button label on red (5.06:1). The button's hover fill is overridden by a narrowly scoped
unlayered theme rule in `src/index.css`
(`[data-slot="button"][data-variant="default"]:hover`) to stay opaque at a darker red
(`#b52b31`, 5.90:1) — the vendored shadcn `hover:bg-primary/80` would otherwise lighten
the label to 3.77:1, and an override inside `@layer components` could not win because
cascade layer order outranks specificity. The gold measures ~1.95:1 on paper and is
therefore decorative only — it never carries text or state. Typography uses local font
stacks only (an `Iowan Old Style`/Palatino/Georgia serif stack for display text, system
sans for body, system mono for meta labels) — **no font or asset is fetched from any CDN
or external origin at runtime**. The bridge elevation under the masthead and the favicon
are repo-native inline SVG.

Interactive/accessibility primitives come from **shadcn/ui** via the official CLI
(`components.json`, `style: radix-nova`): exactly two components are vendored into
`src/components/ui/` — `button.tsx` and `card.tsx` — and both are used by the staging
page (`src/App.tsx` and `src/components/review-preview.tsx`; Button drives the
diagnostics check and the demo reset). No other shadcn components, icon library or font
package is installed. Keeping the components in-repo is the documented shadcn model: they
are plain source you own and style through the theme tokens.

`src/config.ts` and `src/lib/supabase-status.ts` are unchanged by the visual revision and
the review-preview revision.

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
  script and no path routes; the only `vars` are the two **public** `VITE_`
  Supabase values (see "Environment variables" — added on the pending demo
  branch, not yet deployed), and there are no secrets in the config. `"keep_vars": true` preserves
  dashboard-configured plain variables, which a deploy would otherwise delete as the
  config's source of truth (encrypted secrets are never deleted by a deploy); the
  existing settings cannot be inspected from here. Cloudflare syncs the declared
  Custom Domain at deploy. The config does not assert the `*.workers.dev` URL state
  (neither enabled nor disabled); none is claimed. The Custom Domain and Active zone
  are user-confirmed — and the `83c62d5` deploy was observed live on 24 September
  2026 (Daraja title and assets served over HTTPS 200).
- **Build command (dashboard setting, user-confirmed by screenshot):** `npm run build`.
  This must stay in the dashboard: Workers Builds does not honor build commands from
  the Wrangler config, and the route in `wrangler.jsonc` is not a way to set the build
  command.
- **Deploy command (dashboard setting, user-confirmed by screenshot):**
  `npx wrangler deploy`.
- **Build variables (optional since this revision):** `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_PUBLISHABLE_KEY` are **no longer mandatory** — the same two
  public values are versioned as `vars` in `wrangler.jsonc`, and the
  `vite.config.ts` bridge feeds them to `npm run build`. Setting dashboard
  Build variables now acts as an override of the committed defaults. Dashboard
  **Runtime** variables are not the mechanism Vite reads (Wrangler `vars` and
  dashboard runtime vars exist at Worker runtime, not build time) and are inert
  for this static-assets-only Worker. Use `NODE_VERSION=22` if the build image
  does not already provide a compatible Node 22 version.
- The client confirms `ibuka.co.ke` is already a Custom Domain on the Worker and the
  zone is Active. **Deployment observed:** the build of main `83c62d5` (the B05
  `wrangler.jsonc` revision) **succeeded in Cloudflare Workers Builds on
  24 September 2026**, and `https://ibuka.co.ke/` served the Daraja page — the
  Daraja title plus its JS/CSS assets over HTTPS 200. The email sender is not yet
  selected.

### Why the first build failed (observed on commit `f0ae346`)

Workers Builds ran `npx wrangler deploy` with no Wrangler config committed and no
separately executed `npm run build` step (the log went straight from dependency install
to deploy). With no config, Wrangler attempted automatic framework setup, detected
Vite 5.4.21 and stopped: `The version of Vite used in the project ("5.4.21") cannot be
automatically configured. Please update the Vite version to at least "6.0.0" and try
again.` Automatic setup supports only Vite ≥ 6. Committing `wrangler.jsonc` prevents
automatic framework setup entirely: with an explicit config and an explicit dashboard
build command of `npm run build`, the Vite 5 output in `dist/` is uploaded as plain
static assets and no framework detection runs, so no Vite upgrade is needed. The
retried Cloudflare build of main `83c62d5` **succeeded and was observed live on
24 September 2026** (see above).

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

1. Open the staging URL: the page shows the **Daraja** heading and tagline, the
   review-preview section, and the phase list. View-source confirms
   `<title>Daraja · IBUKA Phase 1 (staging)</title>` and `<meta name="robots" content="noindex">`.
   (Observed on 24 September 2026 for the `83c62d5` deployment, before the
   review-preview revision.)
2. **Primary revision check:** in the Cloudflare Workers dashboard, record the
   deployment's revision metadata — deployment ID and the linked commit SHA — when
   available. That metadata, not a local artifact, identifies what was actually deployed.
3. **Optional local cross-check:** the served bundle hash (e.g. `assets/index-<hash>.js`)
   matches a local `npm run build` output **only when the build inputs match**: the same
   code revision *and* the same public environment values, because Vite inlines `VITE_`
   variables into the bundle at build time. A differing hash may reflect environment values or other build inputs; compare like with like.
 4. Inspect the served bundle: no `eyJ…` (JWT-like) strings, no service-role material.
    Note: a build produced **without** any `VITE_` values (no `wrangler.jsonc` defaults,
     no Build variables, no `.env` files) contains no `/auth/v1/health` string at all —
     Vite inlines the unset values as `undefined` and the minifier then folds the check
     to the honest static "Not configured" result. Since the public values are versioned
     in `wrangler.jsonc`, ordinary builds and deploys do embed the fetch path
     (`/auth/v1/health`, `apikey` header, `cache: "no-store"`).
 5. In the visible **Service diagnostics** card, choose **Run connectivity check**:
   - With the versioned defaults (or any override) → "Reachable — HTTP 200" against the
     configured project.
   - Only if every source of the values is absent → "Not configured" (page still renders
     normally).
6. With the public values configured, optionally run the `curl` above from a terminal and record its actual status (a healthy endpoint normally returns `200`).

## Known limits (this revision)

- Single static page; no routing, no sign-in. The assessment surface is the demo-only
  review preview (in-memory, resets on reload); saved assessment, scoring and
  dashboard code are not implemented.
- The shadcn/ui surface is deliberately limited to `Button` and `Card`; adding more
  components is a reviewed decision, not a default.
- Visual acceptance is manual (browser review); there are no visual-regression tests.
- Automated tests cover only the pure progress calculator (`npm test`); the review
  preview UI itself is manual browser review, and there are no visual-regression tests.
- Cloudflare Workers Builds on the connected repository is the CI/deployment path; there
  are no repo-managed GitHub Actions workflows.
- The connectivity check is a diagnostic, not an access-control or tenant-isolation test.
- The `ibuka.co.ke` Custom Domain and Active zone are user-confirmed; deploy and live
  serving were observed on 24 September 2026 for `83c62d5`, and the page remains
  `noindex`. The email sender is unconfirmed.

## Project layout

```
index.html                  # document shell (title, meta, noindex)
src/main.tsx                # React entry point
src/App.tsx                 # visible staging page: review preview + phases + diagnostics
src/components/review-preview.tsx  # demo-only interactive review preview (four proposed fields)
src/index.css               # Tailwind v4 theme: Daraja editorial tokens, KASIB-inspired red/gold
src/config.ts               # public runtime config reader (URL/key presence only)
src/lib/supabase-status.ts  # read-only connectivity check
src/lib/sample-progress.ts  # pure self-reported sample-progress calculator (no DOM)
src/lib/sample-progress.test.ts  # built-in Node fixtures for the calculator (npm test)
src/lib/demo-sample.ts      # the four proposed demo fields: IDs, verbatim prompts, sources
src/components/ui/button.tsx  # shadcn/ui Button (official CLI copy, MIT-derived)
src/components/ui/card.tsx    # shadcn/ui Card (official CLI copy, MIT-derived)
src/vite-env.d.ts           # typed import.meta.env for the two public variables
components.json             # shadcn CLI configuration (radix-nova, css variables)
public/favicon.svg          # bridge mark (paper, ink, KASIB-red water line)
.env.example                # placeholders for the two public variables
```

## Dependency and licence inventory

Direct dependencies, with licences read from each installed package's own declared
`license` field at the pinned version in `package-lock.json` (all versions are pinned
exactly, no ranges). **The review-preview revision added no packages**: the calculator
tests run on Node's built-in TypeScript type-stripping with no test framework.

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
