# CMP Kenya technical guide

Release verified live on 30 September 2026: app runtime revision `336c2314ebf2f5e84e0dfbac09ca159392fe77ac`, database source revision `411f672bb971c021226228aa81b4837ddd17d187`. Both https://cmpkenya.co.ke and https://ibuka.co.ke serve identical reviewed assets from the existing KASIB Worker. Companion release steps: [release-runbook.md](./release-runbook.md); database source: [ibuka-supabase](https://github.com/KASIB-KE/ibuka-supabase). Documentation-only revisions after these refs do not change the verified runtime.

## 1. Runtime architecture

Static React 18 single-page app, built by Vite 5 (`npm run build` → `dist/`), served as plain static assets by the existing customer-created Cloudflare Worker `ibuka-poc` via Workers Builds on the KASIB account. No server-side code runs in the Worker; the browser talks directly to Supabase using only the public project URL and publishable key (`src/config.ts`, committed as `vars` in [`wrangler.jsonc`](../wrangler.jsonc), bridged into the build by [`vite.config.ts`](../vite.config.ts)). The browser is untrusted: every privilege is enforced by the database (grants + RLS), never by hiding UI.

- Supabase project ref: `eaveywzurnrqyeejlapl` (Auth + PostgREST data API; same backend for ibuka and cmpkenya today — **no dev/prod data-isolation claim**).
- Domains: `cmpkenya.co.ke` is active and attached to the existing Worker; `ibuka.co.ke` remains attached. Auth Site URL is `https://cmpkenya.co.ke/`, with both exact origins allowed with and without the trailing slash. These settings were applied and read back; all 18 unrelated settings remained unchanged. Real SMTP/PKCE sign-in, clean callbacks, autosave, Ready status and reload persistence passed on both origins. The origins currently share one Worker and one Supabase project; separate environments are deferred.
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
- Finite-amount validation (`answer_number` excludes NaN/±Infinity, ≥ 0) lives in schema migration `20260930000050_cmp_sample_v2_schema.sql` (sha256 `723a3b5b150b69c1e60e41688ecd37b9a7d36aa689089d370e91ab2e312347a1`) and is **verified locally**: `npm run db:test` exit 0 — 53 REST/Auth checks (including POST+PATCH non-finite regressions) plus 16 populated-upgrade checks (30 September 2026). Applied to the hosted database; all 53 ordinary Auth/PostgREST checks passed there too, including locale-sensitive NBSP cases. The 16 populated-upgrade checks are local verification of historical-answer preservation.

## 4. Autosave and answer semantics

Pure logic: [`src/lib/autosave.ts`](../src/lib/autosave.ts) and [`src/lib/app-data/answer-state.ts`](../src/lib/app-data/answer-state.ts); wiring in [`src/components/saved-assessment.tsx`](../src/components/saved-assessment.tsx) (loaded checklist + answers, save chain, guards).

- 800 ms debounce; per-item serialization; network failures retry at 1 s then 3 s, stopping after bounded attempts with an explicit Retry (manual retry resets the budget).
- A late acknowledgement re-dirties: if the draft changed while the request was in flight, the ack compares the current draft against the confirmed row and re-queues. Identity/load epochs drop stale responses (reload, account switch); `beforeunload` and a cancellable `cmp-before-signout` event warn while anything is dirty or saving.
- Editing a Ready item demotes it to draft; Ready is only offered when the typed answer is adequate. A draft failing `answerWriteIssue` is **never posted**: it rests in a stable "Needs attention" state outside the automatic queue until corrected or retried.
- Number semantics matter: queueing uses strict textual change (`answerTextChanged` — "5000" → "5000 " re-queues), while draft-vs-saved comparison uses semantic numeric equality (`answerDirty`) so a server-canonicalised `1.00` → `1` round-trip settles instead of rewriting forever.
- The anonymous preview ([`src/components/review-preview.tsx`](../src/components/review-preview.tsx)) is memory-only: no autosave, reload resets. Signing in starts the saved assessment; preview entries are **not** transferred.

## 5. Email (Resend SMTP)

Host `smtp.resend.com`, port `465`, user `resend`, sender `CMP Kenya <no-reply@cmpkenya.co.ke>`; the API key was entered by the user directly in the dashboard and must never appear in this repo, the browser or logs. Verified by dashboard readback: Resend shows `cmpkenya.co.ke` status Verified with a Domain verified event, and Supabase custom SMTP is enabled, persisting after reload with the stored password masked. Verified live on both origins: email received from the configured CMP Kenya sender, same-browser PKCE exchange, correct-origin redirect, credentials removed from the callback URL, typed-answer and Ready-state reload persistence, and sign-out clearing the workspace. Test data was synthetic; keys, links and tokens were kept out of logs.

## 6. Verification status

Verified on 30 September 2026:

- Local: unit/build/privacy/diff checks exit 0; 8 mock UI tests, 6 real Auth/Mailpit/PostgREST browser tests, 53 REST/Auth checks and 16 populated-upgrade checks pass.
- Hosted: both reviewed migrations are in the remote history; 53 ordinary-session access checks pass. Workers Builds production build `b4b02fbf-874a-49b4-909d-0ef28592310d` succeeded for app revision `336c2314...`. Both live hostnames serve JavaScript/CSS byte-identical to the reviewed build.
- Live browser: delivered SMTP email, same-origin PKCE, clean callback, typed autosave/reload, Ready-state persistence, narrow-screen layout and sign-out pass on both origins. Anonymous preview progress remains temporary; saved progress uses confirmed rows.
- Independent GLM-5.3 blind resolutions and candidate comparisons completed for backend and UI; this is a separate attempt on the same model/provider, not model diversity. Runtime proof is from the actual checks above.

Open business work: Trevor's validation of the selected questions/content and agreed examples, the wider requirements matrix, template/dictionary conflicts, and formal acceptance/handover. The full 197-entry catalogue is retained internally; full repeatable-table forms, document vault and template generation remain later scope. User journeys are the next product review. Deployment does not imply regulatory validation, contractual acceptance or completion of Phase 2.


## Issuer journey and guidance refinement — 30 September 2026

Release candidate: local implementation; hosted release is pending parent verification. Astra supplied the design; GLM-5.3 produced the initial guidance/target-guard draft. Its correction attempt hit the Coding Plan five-hour quota limit, so Codex completed implementation under the bounded failure fallback. Barak explicitly waived the independent GLM candidate review **for this current UI/guidance/test-workspace pass only**. Review is waived, not completed; all source, regression, visual and live checks remain required.

### Permanent source rule

Before every material change to wording, options, status meanings, scoring, onboarding or user flow, read the relevant current Trevor source sections and recorded decisions. Record the source/version/section and classify alignment, an unspecified design choice or a conflict. Preserve source IDs and verbatim prompts; keep product guidance separate. Surface unresolved discrepancies rather than silently choosing. Verify the changed behaviour and update the technical/task evidence. Passing tests or a deployment do not imply content approval.

### Source decisions

Sources checked: CMP Kenya Review and Confirmations v2, Trevor review D02/D03 and Context D06/D09/D11 (30 September snapshots); the complete body/table text of `IBUKA_Sample_Templates.docx` (received 30 September) and `ipo-platform-template-library.docx` (received 29 September). Sheet coverage rows still describe parts of the older four-item sample. They do not prove approval of the ten-item selection.

- D02 requests key questions; the ten-item selection stays proposed pending Trevor's validation. Prompts/IDs/stored options remain unchanged.
- Template 4 §7.1 supports material products/services and relative revenue importance; §7.4 requires the most recent historical financial period reported, by business segment/geography. Those constraints guide separately authored help.
- CP-07 incorporation is distinct from continuous operating history (Context D06). Document discrepancies need clarification; the UI does not silently adjudicate them.
- Q-RISK-01 retains the narrower prompt about measures the board has put in place; Template 4 §8.2's intended mitigation wording does not broaden answer adequacy.
- D03's ready/applicable formula is retained. None of the current ten allows N/A. Saved-only counts use acknowledged rows; incomplete drafts stay gaps.
- Navigation, hierarchy, next-question focus and mobile composition fill unspecified product-design gaps. The new help is proposed product guidance, not approved regulatory wording.

### Interaction and modules

`src/lib/selected-guidance.ts` contains help for only the ten enabled IDs. CP-13 displays full MIMS/SMEMS names with unchanged stored values and no automatic choice. `assessment-fields.tsx` associates help and distinct compound errors with their inputs; source disclosures remain available. Ready is one explicit action after an adequate answer; edits demote it to Draft. Clean per-item saved chips and the repeated ready paragraph have been removed; the aggregate acknowledgement is authoritative.

`use-question-navigation.ts` switches to the containing section and focuses the chosen input after rendering. `prepared-panel.tsx` offers the next unresolved question and linked remaining items. A saved all-ready summary offers review only when there are no dirty, pending, failed or invalid changes; preview completion has separate temporary wording. Mobile progress is collapsed, leaving the first drafting input visible at 390×844; action targets remain at least44px. Preview tools are disclosed, and temporary/nontransfer/reload behaviour stays visible. Onboarding's test-company display name does not auto-fill the legal-name answer.

The existing debounce, validation, serialization, stale-response guards, identity-bound API and dirty-exit warnings remain intact. `playwright.ui.config.ts` takes optional `CMP_UI_PORT` (default55473); this worktree uses55483. `playwright.config.ts` excludes **all** `ui-*.spec.ts` so the real-stack suite remains separate from mocked tests.

### Test backend and later production

Both HTTPS domains and build previews currently target the same existing synthetic test project `eaveywzurnrqyeejlapl`; hostname roles do not separate databases. Real controlled tester emails are account identities; company answers must be fictional. State-specific Test workspace notices appear in preview, onboarding and saved views.

`src/lib/project-url-guard.ts` allows only the exact canonical hosted origin `https://eaveywzurnrqyeejlapl.supabase.co` or HTTP/HTTPS loopback for local tests. Userinfo, unexpected hosted ports, paths, query/hash, spoofed hosts and other hosted projects are rejected. `src/config.ts` disables Auth/data initialization for an unknown target, including build-env overrides. This prevents accidental target changes; it cannot classify typed text as fictional or replace RLS. No service keys are exposed.

Supabase supports separate projects and isolated branches; persistent branches can serve long-lived staging. Before real-company use, provision a distinct backend through reviewed Terraform plan/apply, apply reviewed migrations, start with clean permitted seeds, configure separate URLs/public keys/Auth/SMTP and review the app guard. Do not copy tester users/answers into production. No new resource, migration, reset or environment has been created in this pass.

### Explicit later gaps

The full template engine, repeatable entities, signed-document vault, expert Verified status, adviser/admin collaboration, client content validation and formal acceptance remain open. Template/dictionary conflicts include SH-02 (nationality vs share counts), CP-18 (confirmation date vs dividend-waiver flag), Q-OFR-02/03 (proceeds/foreign-listing options vs allocation/sensitisation), absent Q-DIV-01/02 and undefined subfields. The sample's unselected allocation choices conflict with the library's default; financial periods and statutory responsibility/disclaimer text also require reconciliation before generation. These tags must not repurpose historical answers.

Design reference: [Jakub Krehel, Details that make interfaces feel better](https://jakub.kr/writing/details-that-make-interfaces-feel-better), read30September2026. The existing antialiased type, stable tabular figures, subtle layered shadows, restrained transitions and44px hit areas follow those details. The issuer information hierarchy and source constraints come from this project's design/source review. No third-party assets or skills were installed.
