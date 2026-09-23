# IBUKA Phase 1 POC contributor guide

This private KASIB repository is the application for the Phase 1 proof of concept. The confirmed working product name is **Daraja** (Barak, 23 September 2026); `ibuka-poc` is a working repository name only, not the product name. KASIB owns the hosting accounts and project data. Use the companion [`ibuka-supabase`](https://github.com/KASIB-KE/ibuka-supabase) repository for versioned database work. This file is for future developers, reviewers and AI coding agents; keep it current as the application is built.

## What Phase 1 must demonstrate

The Phase 1 agreement text available locally lists six outcomes: company registration and magic-link sign-in; an initial assessment with **sample Market listing questions**; basic readiness scoring and gap identification; a preliminary dashboard at a staging URL; proposed architecture and database structure; and a validated requirements matrix with a confirmed **indicative scope for further phases**. It gives no sample count and commissions no later-phase build or fixed later-phase price. Confirm the exact executed copy before making contractual claims.

Phase 1 is a POC. The source pack describes a much larger product with SMEMS, complete Information Memorandum workflows, document generation, professional upload vaults, AI drafting and regulatory submission. Those descriptions guide later requirements mapping; they do not authorise building those modules here. A self-reported POC score must not be labelled legal listing eligibility or regulatory approval.

## Content authority and review

Start with the current IBUKA ClickUp Phase 1 tasks, the executed agreement when available, and the source pack attached to [C01](https://app.clickup.com/t/869f4r6ne). The 22 September kickoff transcript records Trevor saying the pack already supplies field IDs, form prompts and data fields. **Select from those existing fields and prompts before writing new question wording.** The field dictionary, detailed IPO checklist, tiering document and 2023 POLD Regulations serve different purposes: product fields/prompts, checklist coverage, treatment by tier, and primary regulatory text respectively. Preserve stable source IDs and clause references. Note any discrepancy between a client checklist and the regulation for review; do not silently resolve it in code.

Trevor is the authorised **regulatory-content validator**, confirmed by Barak on 23 September 2026. Record his approval or corrections against a versioned sample and matrix. Do not infer formal Phase 1 delivery acceptance from content validation; record the authorised acceptance approver separately. Until validation, label regulatory wording and derived scoring rules as proposed. Do not present source citations or passing tests as client approval. Implement only the small approved sample; the full field dictionary and document workflow are later-scope inputs.

## Architecture boundary

The Phase 1 architecture proposes a static React frontend on KASIB Cloudflare Pages and Supabase Auth/Data API. The browser is untrusted. A frontend build may contain only a public Supabase URL and publishable key, never the service-role key, database password, SMTP credential or provider token. The database must enforce company ownership with grants and row-level security; hiding another company's ID in the UI is not access control. The staging deployment uses a temporary provider URL until the client selects a name/domain and email sender.

The proposed data model and access contract were documented before implementation. When code exists, update this guide to point to the exact entry points, environment template, build/test commands, deployment workflow and migration revision. Keep a clear distinction between **proposed**, **implemented**, **tested** and **client-approved** behavior.

## Working on a change

1. Read the current task and the source/version it depends on. Use a dedicated linked Git worktree for the ticket.
2. State the observable acceptance check before editing. Change one behavior at a time and explain the source-to-UI-to-data path so a new contributor can follow it.
3. Use synthetic company/tester data until data-location and test-data rules are approved. Keep credentials in the KASIB provider settings or local ignored environment files; commit only an example template with placeholders.
4. Run the relevant build/tests and inspect the actual staging state before claiming a deployment works. For a company-scoped feature, exercise two independent test companies and signed-out access at the real API boundary.
5. Record the revision, sample-data version, test evidence and any remaining client decision in the handover notes. Update this file whenever the actual architecture or commands change.

For a newcomer such as Albie, trace one item end to end: **source clause → Trevor's field/prompt ID → UI input → saved value → derived status or score → acceptance check**. The typed input, completion status, and regulatory conclusion are different things. Ask which one a number represents before changing the calculation.

## Implemented foundation (B04, September 2026)

The B04 revision created the static staging frontend under the confirmed working product name **Daraja** ("Bridging business and capital", Barak 23 September 2026); IBUKA remains the project context. Status: **implemented and locally tested; not yet deployed or client-approved.** There is no sign-in, assessment, scoring or dashboard code in this revision, and no regulatory questions are seeded.

- Entry points: `index.html` → `src/main.tsx` → `src/App.tsx` (visible shell plus the "Service diagnostics" panel).
- Environment module: `src/config.ts`, reading only `VITE_SUPABASE_URL` (HTTPS required; loopback `http://` is accepted solely for local development) and `VITE_SUPABASE_PUBLISHABLE_KEY` (template: `.env.example`). Missing or invalid values never break the build; the page reports them honestly at runtime.
- Connectivity check: `src/lib/supabase-status.ts` performs a read-only `GET {SUPABASE_URL}/auth/v1/health` with the publishable key as the `apikey` header and reports the observed response and reachability only. It proves nothing about key validity, authentication or tenant isolation; Pages deployment revision metadata, not a local bundle hash, is the primary deployed-revision check (hash comparison is valid only with identical build inputs, including public env values).
- Commands: `npm ci` (clean install from committed `package-lock.json`), `npm run dev`, `npm run build` (typecheck + production build to `dist/`), `npm run preview`. Full verification and Cloudflare Pages settings are in `README.md`.
- Cloudflare Pages and Supabase resources are client-created; do not provision or mutate them. Deployment of this revision remains **UNKNOWN until observed on the staging URL**; use the Pages deployment revision metadata as the primary check, with the served `assets/index-<hash>.js` compared to a local build only when build inputs (including public env values) are identical.

## Visual revision (B04 refinement, 23 September 2026)

A follow-up revision restyled the same foundation with a Daraja editorial identity after the first staging demo read as "generic". Scope stayed visual; no sign-in, assessment, scoring, dashboard or marketing content was added, and `src/config.ts` / `src/lib/supabase-status.ts` are unchanged. Status: **implemented and locally tested; not yet deployed or client-approved.**

- Styling: Tailwind CSS v4 (`@tailwindcss/vite` plugin, CSS-first theme in `src/index.css`) — warm paper background, deep ink, one terracotta accent, local font stacks only (no external font/asset requests at runtime), repo-native SVG bridge motif and favicon.
- Primitives: shadcn/ui integrated via the official CLI (`components.json`, `radix-nova`); exactly two components are vendored and used — `src/components/ui/button.tsx` and `src/components/ui/card.tsx` (Button drives the diagnostics check; Card holds the "Service diagnostics" panel, which is now visible rather than collapsed). Adding further shadcn components is a reviewed decision, not a default.
- Dependencies are exact-pinned (no ranges): see the README inventory. `radix-ui` provides only `Slot` for Button `asChild`; `cn` and `class-variance-authority` support the vendored components.
- Vite is pinned to 5.4.21 (patched 5.x); `npm audit` still reports dev-server advisories whose only automated fix is Vite 8 (breaking). See the README "Known security advisories" section before running `npm run dev` on an untrusted machine.
- Build-behaviour caveat for verifiers: when the `VITE_` values are unset at build time, the minifier folds the connectivity check to the static honest "Not configured" result, so such bundles contain no `/auth/v1/health` string; the fetch path appears only in builds where the public values were set.
