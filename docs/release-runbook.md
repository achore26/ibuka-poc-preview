# CMP Kenya release runbook

Scope: shipping the selected-question sample v2 (app + DB). At authoring the new code is **verified locally, not yet shipped**; deployed baselines are app `origin/main` `5935e4f4` and DB `cfa5a50f`. Architecture context: [technical-guide.md](./technical-guide.md). DB commands live in the private [ibuka-supabase](https://github.com/KASIB-KE/ibuka-supabase) repo/worktree. Create no new cloud resources imperatively; if genuinely new resources are needed later, provision via Terraform and review first.

## 1. Local verification (app repo)

Prerequisite Node ≥ 22 (`engines`), then `npm ci`.

- `npm test` — unit fixtures (progress, answer-state, autosave, generator).
- `npm run sample:generate` — regenerate runtime JSON + DB seed + manifest; diff-review the seed.
- `npm run build` — typecheck + production build.
- `npm run check:privacy` — proves unselected catalogue IDs/prompts and source maps are absent from `dist/`.
- `npm run test:ui` — **mock** UI suite ([`tests/ui-milestone.spec.ts`](../tests/ui-milestone.spec.ts), loopback `55473`, in-memory PostgREST-shaped adapter, unexpected requests rejected). Frontend wiring only; never citable as database proof.
- `DARAJA_DB_WORKTREE=../cmp-catalogue-db-20260930 npm run test:browser` — real-stack suite ([`tests/assessment.spec.ts`](../tests/assessment.spec.ts) via `tests/run-local.mjs`): real local Auth/REST + Mailpit. **Set `DARAJA_DB_WORKTREE` explicitly**: the runner defaults to `../ibuka-recovery-db`, the old recovery stack on `553xx`, which this worktree must not touch.

App scripts: [`package.json`](../package.json). Final local verification on 30 September 2026: unit, build, privacy and diff checks exit 0; all 8 mock UI tests and all 6 real-stack browser tests pass. Desktop/mobile evidence confirms working navigation, keyboard focus restoration, no overflow and 44-pixel mobile action targets in normal and reduced motion.

## 2. Local verification (DB repo)

Use only the isolated stack `cmp-catalogue-db-20260930` (API `55421`, DB `55422`, Studio `55423`, Mailpit `55424`). **Never reset, stop or touch the shared `ibuka-recovery-db` stack on `553xx` from this worktree.**

- `supabase db reset --local` then `npm run db:test` — the REST/Auth suite (53 checks, including POST+PATCH non-finite numeric regressions) plus the 16-check upgrade-path suite (populated v1 → schema+seed upgrade with byte-identical answer preservation and a real-SQL finiteness check; a fresh reset alone does not prove preservation).
- Verified (30 September 2026): `npm run db:test` exit 0 with those 53 + 16 checks after the finite-amount fix in `20260930000050_cmp_sample_v2_schema.sql` (sha256 `723a3b5b150b69c1e60e41688ecd37b9a7d36aa689089d370e91ab2e312347a1`). Hosted database: **not yet applied**.

## 3. Production sequence

1. **DB first, reviewed.** Dry-run the push against the hosted project with the exact pattern `supabase db push --dry-run --skip-vault --project-ref eaveywzurnrqyeejlapl` (`--skip-vault` avoids dev vault writes). The reviewed dry run exited 0 showing only the two pending migrations (`20260930000050` schema, `20260930000100` seed) — none applied yet; re-run it at ship time. Review the generated seed line by line, then apply with the same command **without** `--dry-run` only after acceptance. Afterwards run the hosted tester (`node tests/run-hosted.mjs --confirm-synthetic-staging-tests`, memory-only credentials, synthetic users only — it requires the v2 migrations to be shipped). Record **expected HTTP codes and provider readback** (e.g. exact row/version observed), not "last test passed". No new resources are created anywhere in this step.
2. **App.** Merge to GitHub `main`; Workers Builds on the existing KASIB account deploys (release in progress, not deployed at authoring). Verify the deployment revision metadata and the served `dist/` asset hashes against a clean local build of the same commit.
3. **Custom domain.** The cmpkenya custom domain attaches declaratively with the release through the custom-domain route in `wrangler.jsonc` via the existing CI — not a separate manual dashboard step. Check HTTPS/TLS serves the new revision on that hostname; keep `ibuka.co.ke` working during transition.
4. **Auth allowlist + real email.** Once HTTPS serves the cmpkenya host: set the Auth site URL to CMP and add both origins to the redirect allowlist — no cross-origin 301s, PKCE requires the same origin. Change settings minimally, preserving existing SMTP/security values. Then one real end-to-end magic-link test per origin: request → email received (Resend sender) → callback exchange succeeds → URL cleaned. Resend domain Verified and Supabase custom SMTP enabled are already confirmed by readback; this step proves actual delivery.
5. **Functional hosted checks.** Signed-in: edit a typed answer → reload → value and status persist; a second synthetic company cannot read or write the first's rows at the API boundary; signed-out access shows no data.
6. **Domain/privacy.** `npm run check:privacy` against the release build; confirm no secrets/keys in the bundle; confirm development diagnostics are absent from the production UI.

## 4. Hazards and rules

- **Cloudflare accounts.** A local `wrangler` login is personal-only; deploys go through the existing client CI/Workers Builds against the pinned KASIB account. Do not preview or deploy from a personal account.
- **SMTP push hazard.** Local `config.toml` development defaults (including SMTP) must not be pushed over hosted security/SMTP settings. Change hosted settings minimally, preserving existing values; never put the Resend key or any secret in a report, commit or log.
- **Recovery preserves data.** On any failure: never drop migration tables, `auth.users`, or answer rows, and never bulk-reset answers. Follow the DB repo's data-preserving rollback guidance; the seed only deactivates and upserts, so re-running the reviewed migrations is the first corrective step.

## 5. Acceptance boundaries

Technical release checks above are separate from Trevor's validation of the regulatory content (source clauses, prompts, scoring meaning) and from formal acceptance (Willie); neither is implied by a deploy date, a passing test or this document. Record each step's evidence (revision, codes, readback) in the handover notes; the final deployed-revision status is written here only after the actual ship.
