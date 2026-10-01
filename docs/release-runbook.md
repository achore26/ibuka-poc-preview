# CMP Kenya release runbook

## Branding release verified — 1 October 2026

Released through PR8: runtime merge `a2ee8f271d8437a876964fe5fc1dd3d85c4ccf86`, implementation `558507c0f655c6601fcffda2f4ec859b4fb791f6`. Existing KASIB production Workers Build `b27a6f5c-3017-41d7-afe6-61a322d2fa38` succeeded for that exact merge. Both https://cmpkenya.co.ke and https://ibuka.co.ke returned HTTP200 and byte-identical reviewed JS/CSS, four supplied logo variants, original favicon and two local fonts (nine checks per origin). Font-ready desktop1440 and phone390/320 preview screenshots were inspected. Worked-example/reset and sign-in-dialog open/Escape checks passed on both live origins; no hosted writes or email requests were made.

Local validation: unit fixtures, production typecheck/build and privacy passed. All17 original UI scenarios passed in the final full-suite run; the final branding test file passed all6 additional scenarios in its affected repeat after correcting keyboard modality probes. Original tests/business logic remained unchanged. Parent source checks found46 protected files byte-identical and one prepared-panel class-only decorative change. Fresh independent GLM blind/reveal plus final evidence comparison passed the local candidate; this pass has no review waiver. Actual route: Z.ai Coding Plan GLM draft, GPT bounded fallback after initial plus resumed timeouts, fresh GLM review. No metered fallback.

Scope: supplied working branding for the walkthrough; client content/brand approval and professional finishing remain open. Existing Astra workspace type sizes/600 heading weight are a deliberate adaptation of the guideline type scale. The original source prompts/options, saved preparation meaning and API/auth/database/infra behavior are preserved; no guideline readiness bands, new report, upload or marketing landing page is introduced. Signed-in UI evidence is mocked locally; older real-stack evidence is historical, not a new real-email/RLS claim. Albie's landing-page/upload/remaining-dashboard work is separately planned for5–9October with exact completion/review dates still TBC.


## Supplied branding candidate — 1 October 2026

For the 2 October walkthrough, the supplied CMP Kenya Brand Identity Guidelines v1.0 (October 2026) supersede the previous placeholder identity and red accent. Original horizontal/logo-icon SVGs are served byte-for-byte from `public/brand`; the original primary icon is also the favicon. The navy rail uses the reversed horizontal lockup at 124px; the small-screen preview uses the primary horizontal lockup at 124px; signed-in company context uses the primary icon at 24px. The 88px mobile/rail header conservatively reserves half the displayed artwork height as clear space. Browser favicon dimensions are platform-controlled.

Palette: Portal Navy `#0B2545`, Listing Green `#0A7A53`, Mist `#F3F6F9`, White, Slate `#4A5568`; gold/mint are restrained accents. Gold is decorative on white. Keyboard focus uses green on light surfaces and mint on the navy rail. Montserrat headings/actions/numbers and Source Sans 3 body fonts are self-hosted WOFF2, unmodified, with OFL licences alongside them and Arial fallback; no font CDN is used.

Source binding: DOCX SHA256 `bbea6b1a3676194aab2333878bb623058028e0030b00a82d828ec8bcceecebb9`; logo ZIP SHA256 `bbba75d524e698e89962ea74a31f50d0bd850d7a9a2e766aa39c515704f5b14f`. Guidelines §§2–5 govern the supplied name, descriptor, tagline, artwork, colours and fonts. The ten source prompts/options, scoring, saved-only preparation semantics, autosave/auth/API, sample files and infrastructure configuration remain unchanged. Guideline §4.1 readiness bands conflict with existing preparation semantics and are deferred; §7 landing-page/report mock-ups are references, not new functionality. Brand-owner approval and professional finishing under §9 remain open.

Actual route: GLM-5.3 through the Z.ai Coding Plan drafted implementation; its initial attempt and one resumed attempt timed out. GPT completed bounded presentation/probe corrections under the handoff failure rule. A fresh GLM blind review is recorded; candidate comparison, production release and actual live checks must be bound to this revision before calling this pass released. The September UI-pass review waiver does not apply to this branding pass. Local mock UI checks are presentation evidence, not new RLS or real-email verification. No hosted data or infrastructure is changed.


Previous issuer design: runtime app revision `5ccf45ccfb9e761b7052fdfd32e1710b6797a330`, verified live on both hostnames on 30 September 2026 through production build `2908f8fb-b3f8-4c23-a2d9-ddbabceefc3b`. Database runtime source remains `411f672bb971c021226228aa81b4837ddd17d187`. Architecture, exact asset hashes, verification scope and remaining gaps: [technical-guide.md](./technical-guide.md). Use the existing KASIB-owned services. New cloud resources, if required later, must use reviewed Terraform.

## 1. Local verification (app repo)

Prerequisite Node ≥ 22 (`engines`), then `npm ci`.

- `npm test` — unit fixtures (progress, answer-state, autosave, generator).
- `npm run sample:generate` — regenerate runtime JSON + DB seed + manifest; diff-review the seed.
- `npm run build` — typecheck + production build.
- `npm run check:privacy` — proves unselected catalogue IDs/prompts and source maps are absent from `dist/`.
- `npm run test:ui` — **mock** UI suite ([`tests/ui-milestone.spec.ts`](../tests/ui-milestone.spec.ts), loopback `55473`, in-memory PostgREST-shaped adapter, unexpected requests rejected). Frontend wiring only; never citable as database proof.
- `DARAJA_DB_WORKTREE=../cmp-catalogue-db-20260930 npm run test:browser` — real-stack suite ([`tests/assessment.spec.ts`](../tests/assessment.spec.ts) via `tests/run-local.mjs`): real local Auth/REST + Mailpit. **Set `DARAJA_DB_WORKTREE` explicitly**: the runner defaults to `../ibuka-recovery-db`, the old recovery stack on `553xx`, which this worktree must not touch.

App scripts: [`package.json`](../package.json). Earlier sample-v2 baseline: unit/build/privacy/diff, eight mock UI tests and six real-stack tests passed. The later issuer design verified all 17 UI scenarios (one slow numeric case passed an isolated repeat), repeated affected final layout/label checks, and passed all six real-stack tests. See the technical guide for the exact release evidence. Desktop/mobile evidence confirms working navigation, keyboard focus restoration, no overflow and 44-pixel mobile action targets in normal and reduced motion.

## 2. Local verification (DB repo)

Use only the isolated stack `cmp-catalogue-db-20260930` (API `55421`, DB `55422`, Studio `55423`, Mailpit `55424`). **Never reset, stop or touch the shared `ibuka-recovery-db` stack on `553xx` from this worktree.**

- `supabase db reset --local` then `npm run db:test` — the REST/Auth suite (53 checks, including POST+PATCH non-finite numeric regressions) plus the 16-check upgrade-path suite (populated v1 → schema+seed upgrade with byte-identical answer preservation and a real-SQL finiteness check; a fresh reset alone does not prove preservation).
- Verified (30 September 2026): `npm run db:test` exit 0 with those 53 + 16 checks after the finite-amount fix in `20260930000050_cmp_sample_v2_schema.sql` (sha256 `723a3b5b150b69c1e60e41688ecd37b9a7d36aa689089d370e91ab2e312347a1`). Hosted database: both migrations applied and read back; all 53 ordinary Auth/PostgREST checks pass.

## 3. Production sequence

1. **DB first, reviewed.** Dry-run the push against the hosted project with the exact pattern `supabase db push --dry-run --skip-vault --project-ref eaveywzurnrqyeejlapl` (`--skip-vault` avoids dev vault writes). The reviewed dry run exited 0 showing only the two pending migrations (`20260930000050` schema, `20260930000100` seed) ; the release subsequently applied both and read back the remote history. Re-run the dry run for future releases. Review the generated seed line by line, then apply with the same command **without** `--dry-run` only after acceptance. Afterwards run the hosted tester (`node tests/run-hosted.mjs --confirm-synthetic-staging-tests`, memory-only credentials, synthetic users only — it requires the v2 migrations to be shipped). Record **expected HTTP codes and provider readback** (e.g. exact row/version observed), not "last test passed". No new resources are created anywhere in this step.
2. **App.** Merge to GitHub `main`; Workers Builds on the existing KASIB account deploys (this release deployed successfully). Verify the deployment revision metadata and the served `dist/` asset hashes against a clean local build of the same commit.
3. **Custom domain.** The cmpkenya custom domain attaches declaratively with the release through the custom-domain route in `wrangler.jsonc` via the existing CI — not a separate manual dashboard step. Check HTTPS/TLS serves the new revision on that hostname; keep `ibuka.co.ke` working during transition.
4. **Auth allowlist + real email.** Once HTTPS serves the cmpkenya host: set the Auth site URL to CMP and add both origins to the redirect allowlist — no cross-origin 301s, PKCE requires the same origin. Change settings minimally, preserving existing SMTP/security values. Then one real end-to-end magic-link test per origin: request → email received (Resend sender) → callback exchange succeeds → URL cleaned. This release passed the full round-trip on both origins using the configured CMP Kenya sender. Repeat for a changed origin, email configuration or auth flow.
5. **Functional hosted checks.** Signed-in: edit a typed answer → reload → value and status persist; a second synthetic company cannot read or write the first's rows at the API boundary; signed-out access shows no data.
6. **Domain/privacy.** `npm run check:privacy` against the release build; confirm no secrets/keys in the bundle; confirm development diagnostics are absent from the production UI.

## 4. Hazards and rules

- **Cloudflare accounts.** A local `wrangler` login is personal-only; deploys go through the existing client CI/Workers Builds against the pinned KASIB account. Do not preview or deploy from a personal account.
- **SMTP push hazard.** Local `config.toml` development defaults (including SMTP) must not be pushed over hosted security/SMTP settings. Change hosted settings minimally, preserving existing values; never put the Resend key or any secret in a report, commit or log.
- **Recovery preserves data.** On any failure: never drop migration tables, `auth.users`, or answer rows, and never bulk-reset answers. Follow the DB repo's data-preserving rollback guidance; the seed only deactivates and upserts, so re-running the reviewed migrations is the first corrective step.

## 5. Acceptance boundaries

Technical release checks above are separate from Trevor's validation of the regulatory content (source clauses, prompts, scoring meaning) and from formal acceptance (Willie); neither is implied by a deploy date, a passing test or this document. Record each step's evidence (revision, codes, readback) in the handover notes; the verified runtime revisions and checks above were recorded after the actual ship.


## UI/guidance refinement gate — 30 September 2026

Current change is a local release candidate until hosted readback. It changes presentation/help and rejects unexpected backend targets; there is **no database migration**. Keep the current synthetic hosted database and both origins. Do not reset or provision resources.

1. Read relevant current Trevor source sections before material copy/flow changes; record alignment, gaps and conflicts as required in the technical guide.
2. Run unit/guard/guidance fixtures, production build, privacy and whitespace checks. Compare the generated sample/IDs/options to the release base and supplied fields.
3. Run `CMP_UI_PORT=55483 npm run test:ui` for this linked worktree: mocked frontend checks, including next-question focus, review-ready withheld during pending edits, all guidance/error references, failure/retry and390×844 screenshots. Run the six real local Auth/Mailpit/REST browser checks with the explicit isolated DB worktree; the real suite excludes `ui-*.spec.ts`.
4. Inspect desktop/mobile screenshots and keyboard/error/save states. Counts use saved rows; preview is clearly temporary, does not transfer and never posts answers. Only sign-in/onboarding can start a saved workspace.
5. Independent GLM candidate review is **waived for this bounded pass by Barak on 30 September 2026 following quota failure**. Do not report it as completed or generalise the exception to other releases.
6. Commit only explicit source/docs paths; exclude the untracked `node_modules` symlink and test/evidence artifacts. Merge through existing KASIB GitHub/Workers Builds. Verify the build's actual commit and served JS/CSS bytes on both HTTPS origins. Exercise affected live preview/sign-in/synthetic save/resume/navigation; use only controlled synthetic test rows and clean up only owned fixtures.
7. Record exact runtime ref, test exits, screenshots, hosted results and the waiver in a version-specific receipt. Update ClickUp task evidence without treating technical release as Trevor/Willie acceptance.

Future real-production isolation requires a distinct reviewed project or persistent branch, Terraform plan/apply, clean migrations/seeds and separate Auth/SMTP/public config. Do not transfer tester rows. See [technical-guide.md](./technical-guide.md) for the guard and source conflicts.
