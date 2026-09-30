# CMP Kenya release runbook

Current issuer design: runtime app revision `5ccf45ccfb9e761b7052fdfd32e1710b6797a330`, verified live on both hostnames on 30 September 2026 through production build `2908f8fb-b3f8-4c23-a2d9-ddbabceefc3b`. Database runtime source remains `411f672bb971c021226228aa81b4837ddd17d187`. Architecture, exact asset hashes, verification scope and remaining gaps: [technical-guide.md](./technical-guide.md). Use the existing KASIB-owned services. New cloud resources, if required later, must use reviewed Terraform.

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
