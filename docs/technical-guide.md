# CMP Kenya technical guide

Status at authoring (30 September 2026): this guide documents the selected-question release **while it is still verified locally but not yet shipped**. Deployed baselines are app `origin/main` `5935e4f4` and DB `cfa5a50f`; everything described below that is newer than those revisions is local/in-progress unless a line says otherwise. Companion release steps: [release-runbook.md](./release-runbook.md). Database work lives in the private [ibuka-supabase](https://github.com/KASIB-KE/ibuka-supabase) repository.

## 1. Runtime architecture

Static React 18 single-page app, built by Vite 5 (`npm run build` → `dist/`), served as plain static assets by the existing customer-created Cloudflare Worker `ibuka-poc` via Workers Builds on the KASIB account. No server-side code runs in the Worker; the browser talks directly to Supabase using only the public project URL and publishable key (`src/config.ts`, committed as `vars` in [`wrangler.jsonc`](../wrangler.jsonc), bridged into the build by [`vite.config.ts`](../vite.config.ts)). The browser is untrusted: every privilege is enforced by the database (grants + RLS), never by hiding UI.

- Supabase project ref: `eaveywzurnrqyeejlapl` (Auth + PostgREST data API; same backend for ibuka and cmpkenya today — **no dev/prod data-isolation claim**).
- Domains: the `cmpkenya` zone is newly Active in Cloudflare, but its custom-domain attachment to the Worker is **not yet deployed** — it attaches declaratively with the release through the custom-domain route in [`wrangler.jsonc`](../wrangler.jsonc) and the existing CI, not as a separate manual dashboard step. `ibuka.co.ke` remains the attached custom domain and the working Auth site URL / callback origin during transition; moving the Auth site URL to CMP and adding both origins to the redirect allowlist follows once HTTPS serves the new host.
- Entry points: `index.html` → `src/main.tsx` → `src/App.tsx` (anonymous preview + sign-in + signed-in workspace).

```mermaid
flowchart LR
  U[Browser] --> W[Cloudflare Worker ibuka-poc\nstatic assets only]
  U -->|public URL + publishable key| S[Supabase eaveywzurnrqyeejlapl]
  S --> A[Auth: PKCE magic link]
  S --> P[PostgREST: company_account,\nchecklist_item, assessment_answer]
```

### Auth state (PKCE, same browser)

`src/lib/supabase-client.ts` creates the SDK client with `flowType: "pkce"`, `detectSessionInUrl: false`. `src/lib/auth-session.ts` performs one explicit `exchangeCodeForSession(code)` per client: the verifier lives in this browser's storage, so a **missing verifier is also a failure** (honest message, recovery = fresh link in the same browser), as are expired/used links. `code`/`error*` parameters are stripped from the URL afterwards regardless of outcome. Sign-in requests `emailRedirectTo: window.location.origin`; a cross-origin 301 would break PKCE, so both exact cmpkenya/ibuka origins must remain allowlisted. Anonymous sessions are excluded from all app policies. Data requests go through `getAccountDataClient()`, which captures the user id and re-checks the live session per token fetch, so a queued request from an old account cannot borrow the next user's token.

```mermaid
stateDiagram-v2
  [*] --> restoring
  restoring --> signed_in: session restored / PKCE exchange ok
  restoring --> signed_out: no session
  signed_out --> signed_in: magic link opened in same browser
  signed_out --> signed_out: link error (verifier missing/expired) + notice
  signed_in --> signed_out: sign out (dirty state warns first)
```

### Save state (autosave)

Edits debounce 800 ms; saves are serialized per item via a promise chain; success is only ever reported from the server-acknowledged row. See §4.

## 2. Catalogue and the enabled sample

The full supplied catalogue — 197 entries: 41 narrative prompts, 126 structured fields, 30 document requirements — stays **outside the browser** in `input/catalogue-source.json` (private). The reviewed selection ([`catalogue/sample-config.json`](../catalogue/sample-config.json)) enables exactly 10 items in four sections, sample version `2026-09-cmp-sample-2` (source revision "CMP workbook v2 observed2026-09-30").

[`tools/generate-sample.mjs`](../tools/generate-sample.mjs) (`npm run sample:generate`) validates the selection against the source (unknown/duplicate/unsupported IDs, enum agreement, source hash) and emits:

1. [`src/lib/generated/enabled-sample.json`](../src/lib/generated/enabled-sample.json) — the only sample data the bundle contains (enabled items only; camelCase `sampleVersion`/`sections`/`items` shape consumed by `src/lib/enabled-sample.ts`);
2. the reviewable DB seed migration `20260930000100_cmp_sample_v2.sql` (ibuka-supabase repo);
3. [`catalogue/generated-manifest.json`](../catalogue/generated-manifest.json) — counts plus sha256 of source, config outputs and seed.

[`tools/check-privacy.mjs`](../tools/check-privacy.mjs) (`npm run check:privacy`) proves over `dist/` that no source maps, unselected IDs or unselected prompts ship. **Not built** (later scope): full form coverage, repeatable-table workflows, a document vault, template/document generation. The ten items: Company details (CP-01 text, CP-07 date, CP-13 select MIMS/SMEMS), Financial position (SC-03 currency, CP-16 currency+date), Business (Q-BUS-01, Q-BUS-03 narrative), Risk and outlook (Q-RISK-01, Q-FIN-02, Q-FIN-03 narrative).

Changing the selection changes the sample version and requires the paired set: a new additive migration sorting **before** a freshly generated seed, regenerated runtime JSON, updated tests, and content validation. Readiness states are self-reported preparation for review — never regulatory approval or listing eligibility.

## 3. Data model, RLS and sample history

Three tables (migrations `20260927000100` schema / `20260927000200` v1 seed, extended by `20260930000050` + `20260930000100`): `company_account` (one per user, unique owner), `checklist_item` (read-only reference data), `assessment_answer` (one row per company+item; typed columns `answer_date`, `answer_bool`, `answer_text`, `answer_number`, `answer_select`, `na_reason`, plus `status`). Row shapes: [`src/lib/app-data/types.ts`](../src/lib/app-data/types.ts).

- anon: no grants, no policies — sees nothing. authenticated: own company/answers only; **no DELETE** anywhere; ownership/keys/timestamps immutable via narrow column grants (clients write only `name`, or status + typed values).
- History: sample v1 (`2026-09-b02-provisional-1`) had CP-07, Q-DIR-01, Q-ISS-01, Q-OFR-03. v2 retains only **CP-07** (same date control, re-activated in place). The three retired definitions are deactivated (`is_active = false`), never deleted: hidden by the read policy and unwritable via the validation trigger, while their historical answers remain readable to their owners. The dated 2026-09-27 migrations are immutable; the new extension migration sorts before the generated seed.
- Publication guard: reads and the answer trigger check the item against the **currently published active version** (`app.sample_release` / `app.current_sample_version()`), not any client-request version — clients send none. A retained-item (CP-07) write from an old client therefore cannot be distinguished and keeps unchanged semantics: it is validated against current database state. The denominator changes 4 → 10 with no rescoring; old and new scores are not comparable.
- Finite-amount validation (`answer_number` excludes NaN/±Infinity, ≥ 0) lives in schema migration `20260930000050_cmp_sample_v2_schema.sql` (sha256 `723a3b5b150b69c1e60e41688ecd37b9a7d36aa689089d370e91ab2e312347a1`) and is **verified locally**: `npm run db:test` exit 0 — 53 REST/Auth checks (including POST+PATCH non-finite regressions) plus 16 populated-upgrade checks (30 September 2026). Not yet applied to the hosted database.

## 4. Autosave and answer semantics (in progress, not yet verified hosted)

Pure logic: [`src/lib/autosave.ts`](../src/lib/autosave.ts) and [`src/lib/app-data/answer-state.ts`](../src/lib/app-data/answer-state.ts); wiring in [`src/components/saved-assessment.tsx`](../src/components/saved-assessment.tsx) (loaded checklist + answers, save chain, guards).

- 800 ms debounce; per-item serialization; network failures retry at 1 s then 3 s, stopping after bounded attempts with an explicit Retry (manual retry resets the budget).
- A late acknowledgement re-dirties: if the draft changed while the request was in flight, the ack compares the current draft against the confirmed row and re-queues. Identity/load epochs drop stale responses (reload, account switch); `beforeunload` and a cancellable `cmp-before-signout` event warn while anything is dirty or saving.
- Editing a Ready item demotes it to draft; Ready is only offered when the typed answer is adequate. A draft failing `answerWriteIssue` is **never posted**: it rests in a stable "Needs attention" state outside the automatic queue until corrected or retried.
- Number semantics matter: queueing uses strict textual change (`answerTextChanged` — "5000" → "5000 " re-queues), while draft-vs-saved comparison uses semantic numeric equality (`answerDirty`) so a server-canonicalised `1.00` → `1` round-trip settles instead of rewriting forever.
- The anonymous preview ([`src/components/review-preview.tsx`](../src/components/review-preview.tsx)) is memory-only: no autosave, reload resets. Signing in starts the saved assessment; preview entries are **not** transferred.

## 5. Email (Resend SMTP)

Host `smtp.resend.com`, port `465`, user `resend`, sender `CMP Kenya <no-reply@cmpkenya.co.ke>`; the API key was entered by the user directly in the dashboard and must never appear in this repo, the browser or logs. Verified by dashboard readback: Resend shows `cmpkenya.co.ke` status Verified with a Domain verified event, and Supabase custom SMTP is enabled, persisting after reload with the stored password masked. Still pending: a real end-to-end magic-link delivery test through PKCE.

## 6. Verification status

Local and verified: DB suites pass after the finite fix (`npm run db:test` exit 0 — 53 REST/Auth + 16 populated-upgrade checks, §3); a reviewed hosted dry run (`supabase db push --dry-run --skip-vault --project-ref eaveywzurnrqyeejlapl`) exited 0 showing only the two 20260930 migrations pending — none applied yet. Final app verification passes locally: unit/build/privacy/diff checks exit 0, 8 mock UI tests and 6 real Auth/Mailpit/PostgREST browser tests pass. Desktop/mobile checks pass with no overflow or browser errors, working keyboard dialog focus and 44-pixel mobile action targets in normal/reduced motion. Pending hosted: migration ship, app deploy (release in progress, **not deployed**), cmpkenya attachment via CI, Auth site-URL/allowlist, real-email PKCE. Content note: source clauses behind the prompts are validated by Trevor as regulatory content, which is separate from formal acceptance (Willie); neither is implied by a date or a passing test here.
