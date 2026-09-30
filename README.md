# CMP Kenya — IBUKA Phase 1 staging frontend

## Current release — 30 September 2026

<!-- CMP live release checkpoint: 30 September 2026 -->
CMP Kenya selected-question release is live at https://cmpkenya.co.ke; https://ibuka.co.ke remains available. Verified runtime app `336c2314...`, DB `411f672b...`: hosted 53 access checks, local 16 populated-upgrade checks, 8 mock UI / 6 real-stack browser tests, and real SMTP/PKCE + autosave/reload on both origins. Current architecture and live evidence: [technical guide](docs/technical-guide.md) · [release runbook](docs/release-runbook.md). Earlier unshipped/blocked notes below are historical. Question-content validation, matrix and formal client acceptance remain open.

**CMP Kenya** is the current application identity for the IBUKA Phase 1 proof of concept.
This private KASIB repository holds the static frontend that builds to `dist/` for the
KASIB Cloudflare Worker `ibuka-poc` (Workers Builds with static assets). The earlier
**Daraja** product name and the four-item review preview are **historical** — see the
historical-evidence sections below; the top-of-file status they describe is superseded.

## CMP workspace features

The application is now the CMP Kenya listing-preparation workspace: a light workspace
composed with a deep navy section rail and restrained red accents, leading with the
assessment itself. **This redesign is deployed and verified live. The selected questions remain proposed pending client content validation.**

| Area | Status |
| --- | --- |
| Selected sample | **Ten questions** (`2026-09-cmp-sample-2`, generated from the reviewed private config; prompts verbatim) across four sections — Company details, Financial position, Business, Risk and outlook |
| Anonymous preview | In-memory only; reload resets; no API writes; worked example `7/10 = 70%` labelled as sample |
| Magic-link sign-in | Compact header action opening an accessible Radix dialog ("Start a saved assessment"); behaviour unchanged (PKCE, same-origin return) |
| Saved assessment + autosave | Implemented (28 September recovery basis); redesign preserves autosave, explicit Ready/draft, stale-ack guards, dirty-signout warning |
| Correctness fixes D1–D5 (30 Sept) | Implemented + unit regressions: stable invalid state (no retry loop), textual UI-change detection, unique compound-control error ids, describedby-only-when-rendered, checklist `allows_na` drift rejection |
| Scoring | Self-reported prepared-for-review only; never a listing eligibility or approval finding |
| Deployment | **Verified live.** `wrangler.jsonc` attaches `cmpkenya.co.ke` alongside `ibuka.co.ke` on the same existing KASIB Worker; production build and both served asset hashes were checked. |

Sample-denominator history: the earlier deployed review preview used a **four-item**
sample (ids CP-07, Q-DIR-01, Q-ISS-01, Q-OFR-03); only **CP-07** is also part of the
selected ten, so 4→10 progress figures are **not comparable**. Historical answers to the
old four items are retained by separate additive database work (52 REST + 16 upgrade
checks passed locally; the reviewed new migration is **not yet shipped**). No database
proof is claimed from this repository. The real-stack suite `tests/assessment.spec.ts`
(`npm run test:browser`) is preserved verbatim for the separate DB-integration phase and
was NOT run for the redesign (parent instruction: do not reset the real stack).

Docs: [`docs/technical-guide.md`](docs/technical-guide.md) ·
[`docs/release-runbook.md`](docs/release-runbook.md) (docs owner maintains these two
files; app changes must not edit them).

## Historical status — Daraja foundation and four-item review preview (superseded)

The sections below this line record the earlier Daraja-era revisions as evidence. Their
"current status" claims are historical and superseded by the CMP status table above:

| Area | Status |
| --- | --- |
| Static staging shell (Vite + React + TypeScript) | Implemented |
| Daraja application UI (Tailwind CSS v4 + shadcn/ui Button/Card/Badge/Input/Textarea/Progress) | Implemented (restyled this revision; deployed and observed live with `1025994` on 25 Sep 2026) |
| Read-only Supabase connectivity diagnostic | Implemented (reachability only) |
| Sample assessment **review preview** (four proposed fields, in-memory demo state, live self-reported sample progress) | Implemented — demo only, not validated, not saved (the `54f4ae6` review-preview revision was deployed and observed live on 24 Sep 2026; the restyle was deployed and observed live with `1025994` on 25 Sep 2026) |
| Company registration / magic-link sign-in | Not implemented (B05, pending) |
| Saved sample assessment (real entries, save/resume) | Not implemented — depends on C03 validation and B05 sign-in |
| Readiness scoring / dashboard (saved, company-scoped) | Not implemented |

The review preview runs entirely in the page with placeholder demo entries: nothing is
persisted, no storage or cookies are used, no API writes occur, and answers reset on
reload. It is labelled as a proposal awaiting validation and produces no regulatory,
listing-eligibility or approval finding.

## Requirements

- Node.js ≥ 22 for the pinned packages (`wrangler` 4.142.0 requires Node ≥ 22; the
  Cloudflare Workers Builds image currently provides Node 24). Check the existing build
  image before setting `NODE_VERSION`.
- npm (a lockfile, `package-lock.json`, is committed; installs must use it).

## Commands

```bash
npm ci            # clean install exactly from package-lock.json
npm run dev       # local dev server with hot reload
npm run build     # typecheck (tsc --noEmit) + production build to dist/
npm run preview   # serve the built dist/ locally at http://localhost:4173
npm test          # built-in Node fixtures (sample-progress, answer-state, autosave, generator)
npm run check:privacy   # prove private catalogue ids/prompts never reach dist/
npm run test:ui   # ADDITIONAL mock-adapter browser suite (Chrome, loopback 55473; mocked, no DB/RLS/email proof)
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
(no script runs), so runtime vars are inert here anyway. The committed `previews.vars`
block repeats the same two public values for non-production previews — top-level
`vars` are not inherited by previews (`assets` and `build` are shared); it is
equally inert at runtime — it exists so
`npx wrangler preview` accepts the configuration.

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
is deliberately not included. This revision is deployed and observed live at
`https://ibuka.co.ke/` (`54f4ae6`, 24 September 2026 — evidence and limits in the
Cloudflare section below); client approval is pending.



## Visual identity and styling

The page uses a restrained shadcn-style application layout defined in `src/index.css`
as a Tailwind CSS v4 CSS-first theme: a compact header bar with the Daraja wordmark,
neutral near-white surfaces, white cards with a subtle 1px ring and 12px radii,
system sans for all text (system mono only for the supplied field IDs and source
references), and one KASIB-inspired deep red (`#c82f35`) used sparingly — the
primary action ("Load worked example"), the progress fill and focus rings. The tone
is **visually inferred from the public KASIB site (kasib.co.ke, observed 24 September
2026); it is not an official brand specification.** There is no official KASIB logo
file; none is fetched or invented, and the repo-native bridge favicon is retained.

The earlier editorial identity — serif display hero, inline bridge elevation,
muted-gold card keyline, uppercased letter-spaced microcopy — was replaced by this
revision (branch `task/demo-ui-refine`) after the first live demo read as "generic";
see `AGENTS.md` for the dated history. The red still meets WCAG AA by
relative-luminance calculation: the near-white button label on red measures 5.06:1
and the button hover fill is kept opaque at a darker red (`#b52b31`, 5.90:1) by the
narrowly scoped unlayered theme rule in `src/index.css`
(`[data-slot="button"][data-variant="default"]:hover`) — the vendored shadcn
`hover:bg-primary/80` would otherwise lighten the label to 3.77:1, and an override
inside `@layer components` could not win because cascade layer order outranks
specificity. Muted foreground (neutral-500) measures 4.74:1 on the white card
surface. Typography uses local font stacks only — **no font or asset is fetched
from any CDN or external origin at runtime.**

Interactive/accessibility primitives come from **shadcn/ui** via the official CLI
(`components.json`, `style: radix-nova`). Six components are vendored into
`src/components/ui/` — `button.tsx` and `card.tsx` (foundation) plus `badge.tsx`,
`input.tsx`, `textarea.tsx` and `progress.tsx` (added by this revision through the
same CLI) — and all are used by the staging page (`src/App.tsx` and
`src/components/review-preview.tsx`). `Progress` uses the `Progress` primitive from
the already-pinned `radix-ui` package; `Badge` uses its `Slot`. No new npm package,
icon library or font was added. Keeping the components in-repo is the documented
shadcn model: they are plain source you own and style through the theme tokens.
The vendored files are unmodified CLI copies; page-level needs (such as the taller
`h-9` on the native date input, or the `h-2` progress track) are applied through
`className` props at the call site.

`src/config.ts` and `src/lib/supabase-status.ts` are unchanged by the visual revision,
the review-preview revision and this UI refinement; the connectivity diagnostic keeps
its read-only logic and is only presented more subordinately (small card, outline
button). `wrangler.jsonc`, `vite.config.ts` and the two versioned public Supabase
values are likewise untouched by the UI refinement.

## Cloudflare Workers Builds settings (client-created Worker; operator-managed settings)

The staging host is the client-created Worker **`ibuka-poc`**; the client confirms
`ibuka.co.ke` is already attached as a Custom Domain and the Cloudflare zone is Active.
The resources remain client-created and owned — do not provision or recreate them — and
the client has authorised the project operator to update the existing Worker's build
settings and retry deployments. The build/deploy commands and build variables live in
the Cloudflare dashboard; the Custom Domain route is declared in `wrangler.jsonc` in
this repository.

- **Committed Wrangler config:** `wrangler.jsonc` — `name: ibuka-poc`,
  `account_id: b28def861e066a2b8467af3e80e33ddc` (the observed KASIB account owning
  the existing Worker; pinning it stops an accidental deploy/preview through a
  different personal account — a disposable personal-account preview was created
  once by mistake and removed; CI already uses a KASIB token),
  `compatibility_date: 2026-09-24`, `assets.directory: ./dist`, `keep_vars: true`, a
  `build` block and a `previews` block (both detailed below), and
  the Custom Domain route declared as code:
  `routes: [{ "pattern": "ibuka.co.ke", "custom_domain": true }]`. The pattern is the
  whole hostname with no path — a Custom Domain matches all paths of that exact hostname
  (`www.ibuka.co.ke` would be a separate hostname). Static-assets-only: no Worker
  script and no path routes; the only `vars` are the two **public** `VITE_`
  Supabase values (see "Environment variables" — deployed and live with `54f4ae6`),
  and there are no secrets in the config. `"keep_vars": true` preserves
  dashboard-configured plain variables, which a deploy would otherwise delete as the
  config's source of truth (encrypted secrets are never deleted by a deploy); the
  existing settings cannot be inspected from here. Cloudflare syncs the declared
  Custom Domain at deploy. The config does not assert the `*.workers.dev` URL state
  (neither enabled nor disabled); none is claimed. The Custom Domain and Active zone
  are user-confirmed — and the `83c62d5` deploy was observed live on 24 September
  2026 (Daraja title and assets served over HTTPS 200).
- **Custom build as code:** `wrangler.jsonc` commits a `build` block
  (`command: "npm run build"`, `watch_dir: "src"`). Verified against the Wrangler
  4.142.0 source and reproduced locally: `npx wrangler deploy` and
  `npx wrangler preview` both resolve their entry through the same `getEntry()`
  helper, which executes `build.command` in a fresh shell before bundling/upload.
  With `dist/` deleted, `npx wrangler deploy --dry-run --outdir <tmp>` ran
  `npm run build` itself and rebuilt `dist/` byte-identically (no credentials, no
  cloud calls). The earlier claim that build commands from the Wrangler config are
  ignored was wrong and is retracted.
- **Build command (dashboard setting, production):** `npm run build`
  (user-confirmed by screenshot) **or empty** — with the committed `build` block a
  fresh `npm run build` runs inside `npx wrangler deploy` either way; when both the
  dashboard command and the Wrangler build block are set, the build simply runs
  twice (harmless, slower).
- **Deploy command (dashboard setting, production, user-confirmed by screenshot):**
  `npx wrangler deploy`.
- **Non-production (previews) pipeline:** dependency install (`npm ci`) then
  `npx wrangler preview` with no separate build step; Wrangler's `build.command`
  supplies the fresh build. The observed release-preview failure (Wrangler 4.142.0)
  was the missing `previews` block: top-level `vars` are not inherited by previews
  (`assets` and `build` are shared), so `wrangler preview` proposed `previews.vars`
  for the two public
  `VITE_` values and errored in CI. `wrangler.jsonc` now commits `previews.vars`
  with the **same two public synthetic staging values** as production. Sharing the
  existing synthetic staging Supabase project (`eaveywzurnrqyeejlapl`) between
  production and previews is intentional: no real customer data and no new
  resources are involved. Limits: hosted email-link login remains blocked until
  the Auth site URL and the exact allowed redirect are set to
  `https://ibuka.co.ke/` (the hosted Auth site URL is still
  `http://localhost:3000` with an empty redirect allowlist, and updates currently
  fail with a Supabase Management API 403); previews are not approved login
  origins; and as in production, `vars`/`previews.vars` are
  inert at runtime for this static-assets-only Worker — the values reach the
  browser only via the Vite build, whose `vite.config.ts` bridge reads the
  top-level `vars`.
- **Wrangler pinned:** `wrangler` 4.142.0 is an exact-pinned devDependency, so
  `npx wrangler …` in any pipeline (including Workers Builds) uses the inspected
  version instead of floating to the latest release. Local config/build validation
  without cloud mutation: `npx wrangler deploy --dry-run --outdir <tmp>`.
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
  zone is Active. **Deployments observed:** main `83c62d5` (B05 `wrangler.jsonc`
  revision) succeeded in Cloudflare Workers Builds on 24 September 2026 and served the
  Daraja title plus JS/CSS assets over HTTPS 200; the demo branch commit `54f4ae6`
  (review preview + public `wrangler.jsonc` vars + Vite bridge) was then served at
  `https://ibuka.co.ke/` the same day: served HTML referenced
  `assets/index-oI3vXnm2.js` and `assets/index-DulRP2WL.css`, both matching a clean
  local build of that commit byte for byte; a live 390px browser showed no horizontal
  overflow, the initial `0/4 = 0.00%`, the worked example `2/3 = 66.67%` with the
  Q-ISS-01 gap, and reset after reload; the read-only Supabase diagnostic returned
  HTTP 200. main `1025994` (shadcn app layout, mobile summary placement, `#fafafa`
  theme color) was then deployed and observed live at `https://ibuka.co.ke/` on
  25 September 2026: Codex independently verified at approximately 10:27 EAT that the
  live `dist/index.html`, `assets/index-BcJcyHZm.js` and `assets/index-Bx5Sbk72.css`
  each matched the local build byte for byte, and live 390px/1280px Chrome checks
  reproduced the layout and demo behavior (`scrollWidth=390`, initial `0.00%`,
  worked-example button top 461px and first question top 726px, worked example
  `66.67%` with Q-ISS-01 the only gap, Reset back to `0.00%`, no overflow at 1280px
  with the summary right of the questions). This observes the visual/demo build
  only — not Trevor's content approval, sign-in, save/persistence, or database
  security. This does not verify Supabase Auth, publishable-key validity, RLS,
  company isolation, Trevor's validation, or contractual acceptance. The email sender
  is not yet selected.

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

1. Open the staging URL: the page shows the Daraja header wordmark, the
    "Sample Market listing assessment" page title with a small "Review preview" badge,
    the four question cards with the progress summary, and the collapsed "About this
    preview" disclosure (the phase list lives inside it). View-source confirms
    `<title>Daraja · IBUKA Phase 1 (staging)</title>` and `<meta name="robots" content="noindex">`.
    (The `83c62d5` and `54f4ae6` deployments were observed live on
    24 September 2026 with the earlier editorial layout, and `1025994` was observed
    live on 25 September 2026 with the current layout; see the deployment-evidence
    bullet above.)
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
- The shadcn/ui surface is deliberately limited to the six vendored components
  (`Button`, `Card`, `Badge`, `Input`, `Textarea`, `Progress`); adding more
  components is a reviewed decision, not a default.
- Visual acceptance is manual (browser review); there are no visual-regression tests.
- Automated tests cover only the pure progress calculator (`npm test`); the review
  preview UI itself is manual browser review, and there are no visual-regression tests.
- Cloudflare Workers Builds on the connected repository is the CI/deployment path; there
  are no repo-managed GitHub Actions workflows.
- The connectivity check is a diagnostic, not an access-control or tenant-isolation test.
- The `ibuka.co.ke` Custom Domain and Active zone are user-confirmed; deploy and live
  serving were observed on 24 September 2026 for `83c62d5` and `54f4ae6`, and the page remains
  `noindex`. The email sender is unconfirmed.

## Project layout

```
index.html                  # document shell (title, meta, noindex)
src/main.tsx                # React entry point
src/App.tsx                 # app shell: header, page title + note, About disclosure, diagnostics, footer
src/components/review-preview.tsx  # demo-only review preview: progress summary first on mobile / sticky side rail on desktop, per-question cards
src/index.css               # Tailwind v4 theme: neutral application tokens, KASIB-inspired red accent
src/config.ts               # public runtime config reader (URL/key presence only)
src/lib/supabase-status.ts  # read-only connectivity check
src/lib/sample-progress.ts  # pure self-reported sample-progress calculator (no DOM)
src/lib/sample-progress.test.ts  # built-in Node fixtures for the calculator (npm test)
src/lib/demo-sample.ts      # the four proposed demo fields: IDs, verbatim prompts, sources
src/components/ui/button.tsx  # shadcn/ui Button (official CLI copy, MIT-derived)
src/components/ui/card.tsx    # shadcn/ui Card (official CLI copy, MIT-derived)
src/components/ui/badge.tsx   # shadcn/ui Badge (official CLI copy, MIT-derived)
src/components/ui/input.tsx   # shadcn/ui Input (official CLI copy, MIT-derived)
src/components/ui/textarea.tsx # shadcn/ui Textarea (official CLI copy, MIT-derived)
src/components/ui/progress.tsx # shadcn/ui Progress (official CLI copy, MIT-derived)
src/vite-env.d.ts           # typed import.meta.env for the two public variables
components.json             # shadcn CLI configuration (radix-nova, css variables)
public/favicon.svg          # bridge mark (paper, ink, KASIB-red water line)
.env.example                # placeholders for the two public variables
```

## Dependency and licence inventory

Direct dependencies, with licences read from each installed package's own declared
`license` field at the pinned version in `package-lock.json` (all versions are pinned
exactly, no ranges). **The review-preview revision and the UI refinement revision
added no packages**: the calculator tests run on Node's built-in TypeScript
type-stripping with no test framework, and the newly vendored shadcn components
(Badge/Input/Textarea/Progress) are source files using the existing pinned
dependencies. The 28 September 2026 release-build fix added one exact-pinned
devDependency: `wrangler` (the deploy/preview CLI), so `npx wrangler …` in any
pipeline uses the inspected version.

| Package | Version | Declared licence | Role |
| --- | --- | --- | --- |
| `react` | 18.3.1 | MIT | UI runtime |
| `react-dom` | 18.3.1 | MIT | React DOM renderer |
| `tailwindcss` | 4.3.3 | MIT | Utility CSS engine (v4, CSS-first theme) |
| `@tailwindcss/vite` | 4.3.3 | MIT | Tailwind v4 Vite plugin |
| `class-variance-authority` | 0.7.1 | Apache-2.0 | Button variant typing (shadcn) |
| `cn` | 0.4.0 | MIT | Class-name merge utility used by the shadcn components |
| `radix-ui` | 1.6.7 | MIT | Provides `Slot` (Button/Badge `asChild`) and the `Progress` primitive |
| `typescript` | 5.6.3 | Apache-2.0 | Type checking (`tsc --noEmit`) |
| `vite` | 5.4.21 | MIT | Build tool and dev/preview server |
| `@vitejs/plugin-react` | 4.3.4 | MIT | Vite ↔ React integration |
| `@types/react` | 18.3.12 | MIT | Type definitions |
| `@types/react-dom` | 18.3.1 | MIT | Type definitions |
| `wrangler` | 4.142.0 | MIT OR Apache-2.0 | Cloudflare deploy/preview CLI (devDependency; pinned exact for reproducible hosted `npx wrangler` behavior) |

`src/components/ui/` holds six files derived from the MIT-licensed shadcn/ui
component source as fetched by the official CLI (`button.tsx`, `card.tsx`,
`badge.tsx`, `input.tsx`, `textarea.tsx`, `progress.tsx`); per shadcn's
model they are owned code in this repository.

The full installed tree (322 packages, including transitive dependencies pinned in
`package-lock.json` after the 28 September 2026 wrangler pin) declares — MIT (256),
Apache-2.0 (26), ISC (7), MPL-2.0 (12), MIT OR Apache-2.0 (3), LGPL-3.0-or-later
components (14: the `@img/sharp-*` libvips platform binaries pulled in by wrangler's
local CLI tree; development tooling only, never part of the static browser bundle),
CC0-1.0 (1), CC-BY-4.0 (1), BSD-3-Clause (1) and 0BSD (1) at the time this inventory
was generated. No transitive licence audit beyond those declarations has been
performed and no deeper claim is made.

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

## Saved assessment recovery — 28 September 2026

Barak authorised provisional implementation of the existing sample/scoring before client validation. The application now implements PKCE email-link sign-in, one-company onboarding, explicit typed answer saves, reload/resume, saved-only progress and a company dashboard. The anonymous review preview remains transient. This section supersedes older statements that authentication/persistence are unimplemented; it does not assert hosted deployment or client approval.

Entry points: `src/lib/auth-session.ts` handles one callback exchange per client and session events; `supabase-client.ts` creates the public auth client and an identity-bound data client. `Workspace` and `SavedAssessment` are keyed by user/company; async loads/writes are invalidated on unmount. Data access lives in `src/lib/app-data`, with ownership enforced by the companion database's RLS and column grants. Sign-out warns about unsaved changes. Saved-only dashboard scoring uses the existing proposed rules and four source IDs.

### Verification and development

```sh
npm ci
npm test
npm run build
# Start/reset/test the companion database first, then:
npm run test:browser
```

Browser tests require installed Google Chrome and the local Supabase stack. `tests/run-local.mjs` reads public local configuration from the sibling `../ibuka-recovery-db` worktree; override its location with `DARAJA_DB_WORKTREE`. It launches Vite on loopback port 5173. Real synthetic email links are retrieved only from local Mailpit. Tests cover typed save/reload, saved-only 66.67% example, failed save/retry, unsaved signout warning, a second account, invalid/wrong-browser links, delayed onboarding/save callbacks during identity switches, expiry recovery, and 390/1280px layouts. Error cases use injected network responses; they do not establish live SMTP delivery. Test screenshots are ignored under `test-results/`.

Dependencies: supabase-js 2.117.2, Playwright 1.63.0, existing exact pins retained. Node 22.18+ is needed for TypeScript-strip unit tests. The existing Vite 5 development-server advisories remain; bind development to loopback. Do not use `npm audit fix --force` without a separate upgrade review.

### Release and remaining decisions

Apply companion migrations 20260927000100/20260927000200 before releasing this app. Existing Cloudflare Workers Builds deploys from main using `wrangler.jsonc`; no new hosting resources are required. Verify deployed assets and real hosted access policies after release. Record local versus hosted checks separately. Roll back the frontend to its preceding revision if needed; preserve database answers and use forward migrations, as documented in the database README.

The sample/scoring remain provisional; Trevor's regulatory-content validation and formal contractual acceptance are separate. Hosted email sender/provider selection and actual external email delivery remain pending. Only synthetic company data is permitted. A functioning login form is not evidence of a delivered hosted email.
