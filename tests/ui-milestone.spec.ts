/*
 * UI-milestone interaction regressions (CMP Kenya, 30 September 2026).
 * ADDITIONAL suite — runs via `npm run test:ui` (playwright.ui.config.ts),
 * strictly separate from the real-stack suite (tests/assessment.spec.ts via
 * `npm run test:browser`), which remains the real-database coverage.
 *
 * MOCK DISCLOSURE — READ BEFORE TRUSTING THESE TESTS: every Supabase
 * REST/auth response below is served by a synthetic in-memory adapter
 * installed with page.route (PostgREST-shaped company/checklist/answer
 * rows plus a fabricated non-expired session JWT), and any request the
 * adapter does not explicitly expect is REJECTED, never forwarded, so the
 * fixtures can neither contact nor write the hosted project. These tests
 * verify FRONTEND COMPONENT WIRING ONLY: autosave scheduling for state
 * actions, numeric acknowledgement equality, typed demotion, persistence
 * through adapter-backed reloads, touch targets, label association and
 * source disclosures. They are NOT proof of row-level security, database
 * constraints, real token exchange or any hosted integration. The
 * real-stack suite and the companion DB-integration milestone own that
 * evidence; nothing here may be cited as database proof.
 */

import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';

const enabled = JSON.parse(
  fs.readFileSync(new URL('../src/lib/generated/enabled-sample.json', import.meta.url), 'utf8'),
) as {
  sampleVersion: string;
  sections: Array<{
    key: string;
    title: string;
    phaseOrder: number;
    items: Array<{
      id: string;
      prompt: string;
      shortLabel: string;
      sourceRef: string;
      control: string;
      allowsNa: boolean;
      displayOrder: number;
      selectOptions?: string[];
    }>;
  }>;
};

const TYPE_BY_CONTROL: Record<string, string> = {
  date: 'date',
  'yes-no': 'yes_no_details',
  narrative: 'narrative',
  'conditional-text': 'text_na',
  text: 'text',
  select: 'select',
  currency: 'currency',
  currency_date: 'currency_date',
};

const USER_ID = '11111111-1111-4111-8111-111111111111';
const COMPANY_ID = '22222222-2222-4222-8222-222222222222';
const COMPANY = {
  id: COMPANY_ID,
  owner_user_id: USER_ID,
  name: 'Synthetic Adapter Company',
  created_at: '2026-09-30T08:00:00+00:00',
  updated_at: '2026-09-30T08:00:00+00:00',
};
const SYNTHETIC_USER = {
  id: USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'adapter.tester@example.test',
  email_confirmed_at: '2026-09-30T08:00:00+00:00',
  confirmed_at: '2026-09-30T08:00:00+00:00',
  last_sign_in_at: '2026-09-30T08:00:00+00:00',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  identities: [],
  created_at: '2026-09-30T08:00:00+00:00',
  updated_at: '2026-09-30T08:00:00+00:00',
  is_anonymous: false,
};

const checklistRows = enabled.sections.flatMap((section) =>
  section.items.map((item) => ({
    id: item.id,
    title: item.shortLabel,
    question_text: item.prompt,
    field_type: TYPE_BY_CONTROL[item.control],
    allows_na: item.allowsNa,
    party_key: 'issuer',
    phase_order: section.phaseOrder,
    display_order: item.displayOrder,
    source_reference: item.sourceRef,
    select_options: item.selectOptions ?? null,
    sample_version: enabled.sampleVersion,
    is_active: true,
    created_at: '2026-09-30T08:00:00+00:00',
  })),
);

interface StoredRow {
  company_id: string;
  item_id: string;
  status: string;
  answer_date: string | null;
  answer_bool: boolean | null;
  answer_text: string | null;
  answer_number: number | null;
  answer_select: string | null;
  na_reason: string | null;
  updated_at: string;
}

/** Everything a seed must state explicitly — no silently defaulted columns. */
type SeedFields = Omit<StoredRow, 'company_id' | 'item_id' | 'updated_at'>;

const EMPTY_ANSWER: SeedFields = {
  status: 'not_started',
  answer_date: null,
  answer_bool: null,
  answer_text: null,
  answer_number: null,
  answer_select: null,
  na_reason: null,
};

interface CapturedWrite {
  method: string;
  itemId: string;
  status: string | null;
  body: Record<string, unknown>;
}

interface Adapter {
  rows: Map<string, StoredRow>;
  writes: CapturedWrite[];
  failWrites: boolean;
  holdWrites?: Promise<void>;
  /** Failed (503) write attempts per item — observes the bounded retry budget. */
  failedAttempts: Record<string, number>;
  /** Requests the adapter does not model — must stay empty; never forwarded. */
  unexpected: string[];
  seedAnswer(itemId: string, row: SeedFields): void;
}

async function installSyntheticApi(page: Page): Promise<Adapter> {
  const adapter: Adapter = {
    rows: new Map(),
    writes: [],
    failWrites: false,
    failedAttempts: {},
    unexpected: [],
    seedAnswer(itemId, row) {
      adapter.rows.set(itemId, {
        ...row,
        company_id: COMPANY_ID,
        item_id: itemId,
        updated_at: new Date().toISOString(),
      });
    },
  };

  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  await page.route('**/rest/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const table = url.pathname.split('/rest/v1/')[1];
    const method = route.request().method();
    const eq = (key: string) => (url.searchParams.get(key) ?? '').replace(/^eq\./, '');

    if (table === 'company_account' && method === 'GET') return json(route, [COMPANY]);
    if (table === 'checklist_item' && method === 'GET') return json(route, checklistRows);

    if (table === 'assessment_answer') {
      if (method === 'GET') {
        let rows = [...adapter.rows.values()];
        const companyId = eq('company_id');
        const itemId = eq('item_id');
        if (companyId) rows = rows.filter((row) => row.company_id === companyId);
        if (itemId) rows = rows.filter((row) => row.item_id === itemId);
        return json(route, rows);
      }
      const body = route.request().postDataJSON() as Partial<StoredRow>;
      if (adapter.holdWrites) await adapter.holdWrites;
      if (adapter.failWrites) {
        // Count the failed attempt so tests can observe the bounded retry
        // budget deterministically (three automatic attempts, then stop).
        const itemId = body.item_id ?? eq('item_id');
        adapter.failedAttempts[itemId] = (adapter.failedAttempts[itemId] ?? 0) + 1;
        return json(route, { message: 'Synthetic outage' }, 503);
      }
      if (method === 'POST') {
        const existing = [...adapter.rows.values()].find(
          (row) => row.company_id === body.company_id && row.item_id === body.item_id,
        );
        if (existing) {
          // PostgREST-shaped unique-violation the client retried as update.
          return json(
            route,
            {
              code: '23505',
              message:
                'duplicate key value violates unique constraint "assessment_answer_company_id_item_id_key"',
            },
            400,
          );
        }
        const row: StoredRow = {
          company_id: COMPANY_ID,
          item_id: body.item_id ?? '',
          status: body.status ?? 'not_started',
          answer_date: body.answer_date ?? null,
          answer_bool: body.answer_bool ?? null,
          answer_text: body.answer_text ?? null,
          answer_number: body.answer_number ?? null,
          answer_select: body.answer_select ?? null,
          na_reason: body.na_reason ?? null,
          updated_at: new Date().toISOString(),
        };
        adapter.rows.set(row.item_id, row);
        adapter.writes.push({ method: 'POST', itemId: row.item_id, status: row.status, body });
        return json(route, row);
      }
      if (method === 'PATCH') {
        const itemId = eq('item_id');
        const row = adapter.rows.get(itemId);
        if (!row) return json(route, { code: 'PGRST116', message: 'Row not found' }, 406);
        Object.assign(row, body, { updated_at: new Date().toISOString() });
        adapter.writes.push({ method: 'PATCH', itemId, status: row.status, body });
        return json(route, row);
      }
    }

    // Catch-all: the adapter must be hermetic. An unmodelled request is a
    // fixture bug — reject it locally and record it; NEVER route.continue()
    // to the real hosted project.
    adapter.unexpected.push(`${method} ${url.pathname}${url.search}`);
    return route.abort('failed');
  });

  // setSession() resolves the user through GET /auth/v1/user for the
  // fabricated (non-expired) token; serve the synthetic user.
  await page.route('**/auth/v1/user*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SYNTHETIC_USER) }),
  );

  // A ?code= callback exchange must resolve against the adapter too — an
  // error response keeps the suite hermetic (never forwarded to the hosted
  // project) and exercises the failed-callback notice path.
  await page.route('**/auth/v1/token*', (route) =>
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid authorization code' }),
    }),
  );

  return adapter;
}

function syntheticJwt(): string {
  const segment = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  // The signature segment is unconstrained bytes, but every JWT segment must
  // be well-formed base64url (the SDK validates length mod 4) — so encode the
  // marker instead of using a raw string.
  const signature = Buffer.from("synthetic-adapter-signature").toString("base64url");
  return `${segment({ alg: "none", typ: "JWT" })}.${segment({
    sub: USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: SYNTHETIC_USER.email,
    iat: now,
    exp: now + 24 * 60 * 60,
  })}.${signature}`;
}

async function signInSynthetic(page: Page) {
  await page.goto('/');
  await page.evaluate(async (token) => {
    const module = await import('/src/lib/supabase-client.ts');
    await module.getSupabaseClient().auth.setSession({
      access_token: token,
      refresh_token: 'synthetic-adapter-refresh',
    });
  }, syntheticJwt());
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
}

/** The saved form is ready when the first company-section field is mounted. */
async function waitForSavedAssessment(page: Page) {
  await expect(page.locator('#CP-01-text')).toBeVisible();
}

async function waitForAllSaved(page: Page) {
  await expect(page.getByText(/All changes saved/).first()).toBeVisible();
}

/** Switch the one-visible-section form to the given group on any viewport. */
async function openSection(page: Page, key: 'company' | 'financial' | 'business' | 'risk', title: string) {
  const selector = page.locator('#section-select');
  if (await selector.isVisible()) {
    await selector.selectOption(key);
  } else {
    await page.getByRole('button', { name: new RegExp(title) }).first().click();
  }
}

/** Every actually-visible button, radio row and disclosure offers >=44px at 390px. */
async function expectMobileTouchTargets(page: Page) {
  const report = await page.evaluate(() => {
    const out: { text: string; height: number }[] = [];
    const visible = (el: HTMLElement) => {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      if (typeof el.checkVisibility === 'function' && !el.checkVisibility()) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const targets = [
      ...Array.from(document.querySelectorAll<HTMLElement>('button')),
      ...Array.from(document.querySelectorAll<HTMLElement>('summary')),
      ...Array.from(document.querySelectorAll<HTMLElement>('label')).filter((label) =>
        label.querySelector('input[type="radio"]'),
      ),
    ];
    for (const el of targets) {
      if (!visible(el)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.height < 44) {
        out.push({ text: (el.textContent || '').trim().slice(0, 40), height: Math.round(rect.height) });
      }
    }
    return {
      violations: out,
      innerWidth: window.innerWidth,
      matchSm: window.matchMedia('(min-width: 40rem)').matches,
    };
  });
  expect(report.violations, JSON.stringify(report)).toEqual([]);
}

test('invalid draft rests in a stable needs-attention state with zero writes; a corrected edit saves (D1)', async ({
  page,
}) => {
  const adapter = await installSyntheticApi(page);
  await signInSynthetic(page);
  await waitForSavedAssessment(page);

  await openSection(page, 'financial', 'Financial position');
  const paidUp = page.locator('article', { has: page.locator('#SC-03-amount') });
  await paidUp.locator('#SC-03-amount').fill('abc');

  // Validation surfaces on the control and the item parks in the STABLE
  // "Needs attention" state — the pre-fix bug oscillated it back to
  // "Unsaved changes" every debounce cycle.
  await expect(paidUp.getByText('Needs attention', { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(paidUp.getByText(/Enter a plain number/)).toBeVisible();

  // Resting >= 3s: no writes, and the state stays "Needs attention"
  // (never flips back to the automatic queue).
  await page.waitForTimeout(3200);
  expect(adapter.writes.filter((write) => write.itemId === 'SC-03')).toEqual([]);
  await expect(paidUp.getByText('Needs attention', { exact: true })).toBeVisible();
  await expect(paidUp.getByText('Unsaved changes', { exact: true })).toHaveCount(0);

  // A corrected edit resumes saving automatically with a fresh budget.
  await paidUp.locator('#SC-03-amount').fill('5000');
  await expect
    .poll(() => adapter.writes.filter((write) => write.itemId === 'SC-03').length, { timeout: 10_000 })
    .toBe(1);
  expect(adapter.writes[0]?.body.answer_number).toBe(5000);
  await waitForAllSaved(page);
  await waitForAllSaved(page);

  expect(adapter.unexpected).toEqual([]);
});

test('typing a trailing space on a saved amount keeps the typed string and settles (D2)', async ({ page }) => {
  const adapter = await installSyntheticApi(page);
  adapter.seedAnswer('SC-03', { ...EMPTY_ANSWER, status: 'in_progress', answer_number: 5000 });
  await signInSynthetic(page);
  await waitForSavedAssessment(page);

  await openSection(page, 'financial', 'Financial position');
  const paidUp = page.locator('article', { has: page.locator('#SC-03-amount') });
  await expect(paidUp.locator('#SC-03-amount')).toHaveValue('5000');

  // Typing "5000 " over a saved "5000" is a TEXTUAL UI change: the typed
  // string must survive (the pre-fix numeric comparison snapped it back).
  // The saved row already confirms the numerically identical 5000, so NO
  // new write is due — the item must SETTLE CLEAN (no stuck
  // "Unsaved changes") and the typed string stays. fill() is used because
  // a raw keyboard space at a Mac-Chrome caret can land at the value
  // start; the contract under test is the textual change, not the caret.
  await paidUp.locator('#SC-03-amount').fill('5000 ');
  await expect(paidUp.locator('#SC-03-amount')).toHaveValue('5000 ');
  await expect(paidUp.getByText('Unsaved changes', { exact: true })).toHaveCount(0, { timeout: 10_000 });
  await waitForAllSaved(page);
  await waitForAllSaved(page);
  await page.waitForTimeout(2500);
  expect(adapter.writes.filter((write) => write.itemId === 'SC-03').length).toBe(0);
  await expect(paidUp.locator('#SC-03-amount')).toHaveValue('5000 ');

  expect(adapter.unexpected).toEqual([]);
});

test('sign-in dialog: keyboard open, trap, description, Escape close, focus return, 44px mobile close', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#CP-01-text')).toBeVisible();

  const trigger = page.getByRole('button', { name: 'Sign in', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Start a saved assessment' })).toBeVisible();
  // The temporary/saved distinction is stated, and the email control is
  // reachable inside the trap.
  await expect(dialog.getByText(/reloading the page resets/i)).toBeVisible();
  await expect(dialog.getByLabel('Email address', { exact: true })).toBeVisible();
  // Focus is inside the dialog after opening.
  expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();

  // Real close button meets the 44px target on phones.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await trigger.click();
  const close = dialog.getByRole('button', { name: 'Close' });
  await expect(close).toBeVisible();
  const box = await close.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await close.click();
  await expect(dialog).toHaveCount(0);
});

test('failed link callback opens the dialog once; closing keeps it closed and the notice stays visible', async ({
  page,
}) => {
  await page.goto('/?code=invalid-code');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await expect(dialog.getByText(/could not be used|could not find the original sign-in request/i)).toBeVisible();
  // The callback token was scrubbed from the URL.
  expect(new URL(page.url()).searchParams.has('code')).toBe(false);

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  // It must NOT force itself back open on later renders...
  await page.waitForTimeout(800);
  await expect(dialog).toHaveCount(0);
  // ...and the recovery notice remains visible outside the dialog.
  await expect(page.getByRole('alert').first()).toBeVisible();
});

test('state changes autosave without a manual save: Ready on a clean saved draft, reload, Return to draft', async ({
  page,
}) => {
  const adapter = await installSyntheticApi(page);
  await signInSynthetic(page);
  await waitForSavedAssessment(page);

  // A clean, saved, valid draft exists for CP-01 before any interaction.
  adapter.seedAnswer('CP-01', { ...EMPTY_ANSWER, status: 'in_progress', answer_text: 'Synthetic saved draft name' });
  await page.reload();
  await waitForSavedAssessment(page);
  const legalName = page.locator('article', { has: page.locator('#CP-01-text') });
  await expect(legalName.getByText('Draft', { exact: true })).toBeVisible();
  expect(adapter.writes).toEqual([]);

  // Regression (30 Sept 2026): clicking Ready on a clean saved item must
  // autosave — no manual "Save now" anywhere in this flow.
  await legalName.getByRole('button', { name: 'Mark ready for review', exact: true }).click();
  await expect
    .poll(() => adapter.writes.filter((write) => write.itemId === 'CP-01').length, { timeout: 10_000 })
    .toBe(1);
  const readyWrite = adapter.writes.find((write) => write.itemId === 'CP-01');
  expect(readyWrite?.method).toBe('PATCH'); // seeded row -> insert conflicted, update path taken
  expect(readyWrite?.status).toBe('ready');
  await waitForAllSaved(page);
  await waitForAllSaved(page);

  // Reload: readiness came back from the (adapter-backed) saved row.
  await page.reload();
  await waitForSavedAssessment(page);
  const legalNameAfterReload = page.locator('article', { has: page.locator('#CP-01-text') });
  await expect(page.locator('#CP-01-text')).toHaveValue('Synthetic saved draft name');
  await expect(legalNameAfterReload.getByRole('button', { name: 'Return to draft', exact: true })).toBeVisible();
  await expect(legalNameAfterReload.getByText('Ready for review', { exact: true }).first()).toBeVisible();

  // Return to draft autosaves too, and survives reload.
  await legalNameAfterReload.getByRole('button', { name: 'Return to draft', exact: true }).click();
  await expect
    .poll(() => adapter.writes.filter((write) => write.itemId === 'CP-01').length, { timeout: 10_000 })
    .toBe(2);
  expect(adapter.writes[1].status).toBe('in_progress');
  await waitForAllSaved(page);
  await page.reload();
  await waitForSavedAssessment(page);
  await expect(page.locator('article', { has: page.locator('#CP-01-text') }).getByText('Draft', { exact: true })).toBeVisible();

  // Typed demotion semantics preserved: editing a persisted ready item
  // returns it to draft AND autosaves the edited value.
  adapter.seedAnswer('CP-07', { ...EMPTY_ANSWER, status: 'ready', answer_date: '1995-06-15' });
  await page.reload();
  await waitForSavedAssessment(page);
  const incorporation = page.locator('article', { has: page.locator('#CP-07-date') });
  await incorporation.locator('#CP-07-date').fill('2001-02-03');
  await expect(incorporation.getByText('Draft', { exact: true })).toBeVisible();
  await expect
    .poll(() => adapter.writes.filter((write) => write.itemId === 'CP-07').length, { timeout: 10_000 })
    .toBe(1);
  expect(adapter.writes.find((write) => write.itemId === 'CP-07')?.status).toBe('in_progress');
  await waitForAllSaved(page);
  await page.reload();
  await waitForSavedAssessment(page);
  await expect(page.locator('#CP-07-date')).toHaveValue('2001-02-03');

  expect(adapter.unexpected).toEqual([]);
});

test('acknowledged numeric canonicalisation settles clean: typed 1.00 vs saved 1 is not endlessly rewritten', async ({
  page,
}) => {
  const adapter = await installSyntheticApi(page);
  await signInSynthetic(page);
  await waitForSavedAssessment(page);

  await openSection(page, 'financial', 'Financial position');
  const paidUp = page.locator('article', { has: page.locator('#SC-03-amount') });
  await paidUp.locator('#SC-03-amount').fill('1.00');

  await expect
    .poll(() => adapter.writes.filter((write) => write.itemId === 'SC-03').length, { timeout: 10_000 })
    .toBe(1);
  const write = adapter.writes.find((w) => w.itemId === 'SC-03');
  expect(write?.method).toBe('POST'); // no seeded row -> insert path
  expect(write?.body.answer_number).toBe(1); // adapter canonicalised like the numeric column

  // The typed text is preserved (not clobbered by the acknowledgement) and
  // the item is CLEAN: Saved chip, no Unsaved-changes chip.
  await expect(paidUp.locator('#SC-03-amount')).toHaveValue('1.00');
  await waitForAllSaved(page);
  await expect(paidUp.getByText('Unsaved changes', { exact: true })).toHaveCount(0);
  await waitForAllSaved(page);

  // Settling: no further writes for SC-03 after the debounce/backoff windows.
  await page.waitForTimeout(2500);
  expect(adapter.writes.filter((write) => write.itemId === 'SC-03').length).toBe(1);

  // Reload: the canonicalised 1 comes back, stays clean, and settles without
  // any new write (the pre-fix bug re-dirtied "1.00" vs "1" here).
  await page.reload();
  await waitForSavedAssessment(page);
  await openSection(page, 'financial', 'Financial position');
  await expect(page.locator('#SC-03-amount')).toHaveValue('1');
  await expect(page.locator('article', { has: page.locator('#SC-03-amount') }).getByText('Unsaved changes', { exact: true })).toHaveCount(0);
  await page.waitForTimeout(2500);
  expect(adapter.writes.filter((write) => write.itemId === 'SC-03').length).toBe(1);

  expect(adapter.unexpected).toEqual([]);
});

test('failed saves keep edits, Retry recovers, and mobile touch targets stay >=44px', async ({ page }) => {
  const adapter = await installSyntheticApi(page);
  adapter.seedAnswer('Q-BUS-01', { ...EMPTY_ANSWER, status: 'in_progress', answer_text: 'Synthetic products draft' });
  await signInSynthetic(page);
  await waitForSavedAssessment(page);

  adapter.failWrites = true;
  await openSection(page, 'business', 'Business');
  const products = page.locator('article', { has: page.locator('#Q-BUS-01-narrative') });
  await products.locator('#Q-BUS-01-narrative').fill('Edited during synthetic outage');
  // Backoff (1s, 3s) exhausts the automatic retry budget — the retry budget
  // is observed through the adapter's counted 503s, so the Retry action is
  // STABLE (no automatic requeue pending) before this test recovers it.
  await expect(products.getByText('Could not save', { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect
    .poll(() => adapter.failedAttempts['Q-BUS-01'] ?? 0, { timeout: 20_000 })
    .toBeGreaterThanOrEqual(3);
  await expect(products.locator('#Q-BUS-01-narrative')).toHaveValue('Edited during synthetic outage');
  // The budget stopped by itself: no further failed attempts while resting.
  const rested = adapter.failedAttempts['Q-BUS-01'] ?? 0;
  await page.waitForTimeout(3500);
  expect(adapter.failedAttempts['Q-BUS-01'] ?? 0).toBe(rested);

  // Visible failure-state actions meet the 44px mobile target contract
  // (buttons, radio rows and the per-field Source disclosure summary).
  // Reduced motion is emulated and we settle one frame so the resize
  // transition can never be measured mid-flight.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await expect(products.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
  await expectMobileTouchTargets(page);

  adapter.failWrites = false;
  await products.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect
    .poll(() => adapter.writes.filter((write) => write.itemId === 'Q-BUS-01').length, { timeout: 10_000 })
    .toBe(1);
  expect(adapter.writes[0].status).toBe('in_progress');
  await waitForAllSaved(page);

  expect(adapter.unexpected).toEqual([]);
});

test('one visible label per short typed field with programmatic association; source refs behind a disclosure', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#CP-01-text')).toBeVisible();

  // The prompt heading is the single visible label; the control is
  // associated with it programmatically (aria-labelledby -> heading id).
  const legalName = page.locator('article', { has: page.locator('#CP-01-text') });
  expect(await legalName.getByText('Legal name', { exact: true }).count()).toBe(1);
  expect(await page.locator('#CP-01-text').getAttribute('aria-labelledby')).toBe('CP-01-prompt');
  expect(await page.locator('#CP-01-prompt').textContent()).toBe('Legal name');

  // Narrative prompts keep their short secondary visible label, associated
  // with the textarea via the native label/for pair (navigate to Business —
  // only the active section is mounted).
  await openSection(page, 'business', 'Business');
  const products = page.locator('article', { has: page.locator('#Q-BUS-01-narrative') });
  await expect(products.getByLabel('Principal products and services', { exact: true })).toBeVisible();
  expect(await products.locator('label[for="Q-BUS-01-narrative"]').count()).toBe(1);

  // Compound currency_date keeps exactly one visible extra label for the
  // second input; the amount input is associated with the prompt heading.
  // "One visible label" counts only RENDERED-VISIBLE matches: the closed
  // Source disclosure keeps the verbatim prompt in the DOM (provenance is
  // not removed for the test) but it is not a visible label.
  await openSection(page, 'financial', 'Financial position');
  const assets = page.locator('article', { has: page.locator('#CP-16-amount') });
  const visibleTotalAssets = await assets
    .getByText('Total assets')
    .evaluateAll((els) => els.filter((el) => el.checkVisibility()).length);
  expect(visibleTotalAssets).toBe(1);
  expect(await page.locator('#CP-16-amount').getAttribute('aria-labelledby')).toBe('CP-16-prompt');
  await expect(page.locator('#CP-16-as-at')).toBeVisible();
  expect(await assets.locator('label[for="CP-16-as-at"]').count()).toBe(1);

  // Source references are not printed by default (multiple closed
  // disclosures may coexist in the DOM across the visible section's
  // articles — every one must be closed/hidden); the per-field disclosure
  // preserves the supplied ID, the exact source reference and the verbatim
  // source question (enabled items only — never the wider catalogue).
  const sourceRefs = page.getByText('Source ref');
  expect(await sourceRefs.count()).toBeGreaterThan(0);
  for (const element of await sourceRefs.all()) {
    expect(await element.isVisible()).toBe(false);
  }
  const incorporation = page.locator('article', { has: page.locator('#CP-07-date') });
  await openSection(page, 'company', 'Company details');
  await incorporation.locator('details', { hasText: 'Source' }).locator('summary').click();
  await expect(incorporation.getByText('Supplied ID CP-07')).toBeVisible();
  await expect(incorporation.getByText(/6th 3\.3 \/ A\.1/)).toBeVisible();
  await expect(incorporation.getByText('Verbatim source question: “Date of incorporation”')).toBeVisible();
});


test('Continue and remaining-item links switch section and focus the unresolved input', async ({ page }) => {
  const adapter = await installSyntheticApi(page);
  for (const id of ['CP-01', 'CP-07', 'CP-13']) {
    adapter.seedAnswer(id, { ...EMPTY_ANSWER, status: 'ready',
      answer_text: id === 'CP-01' ? 'Synthetic legal name' : null,
      answer_date: id === 'CP-07' ? '1995-06-15' : null,
      answer_select: id === 'CP-13' ? 'MIMS' : null,
    });
  }
  await signInSynthetic(page);
  await waitForSavedAssessment(page);
  const panel = page.getByRole('complementary', { name: 'Assessment progress' });
  await expect(panel.getByText('3 of 10')).toBeVisible();
  await panel.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.locator('#SC-03-amount')).toBeFocused();
  await panel.getByText('View remaining items (7)', { exact: true }).click();
  await panel.getByRole('button', { name: /Principal products and services/ }).click();
  await expect(page.locator('#Q-BUS-01-narrative')).toBeFocused();
  expect(adapter.unexpected).toEqual([]);
});

test('review-ready is withheld during a held edit even when saved progress is 10 of 10', async ({ page }) => {
  const adapter = await installSyntheticApi(page);
  for (const section of enabled.sections) for (const item of section.items) {
    const row = { ...EMPTY_ANSWER, status: 'ready' };
    if (item.control === 'text' || item.control === 'narrative') row.answer_text = 'Synthetic complete answer';
    if (item.control === 'date' || item.control === 'currency_date') row.answer_date = '2025-12-31';
    if (item.control === 'currency' || item.control === 'currency_date') row.answer_number = 5000;
    if (item.control === 'select') row.answer_select = 'MIMS';
    adapter.seedAnswer(item.id, row);
  }
  await signInSynthetic(page);
  await waitForSavedAssessment(page);
  const panel = page.getByRole('complementary', { name: 'Assessment progress' });
  await expect(panel.getByText('Your sample answers are ready for review.')).toBeVisible();
  let release!: () => void;
  adapter.holdWrites = new Promise<void>((resolve) => { release = resolve; });
  try {
    await page.locator('#CP-01-text').fill('Synthetic changed legal name');
    await expect(panel.getByText('10 of 10')).toBeVisible();
    await expect(panel.getByText('Your sample answers are ready for review.')).toHaveCount(0);
    await expect(panel.getByText('Progress reflects the last saved answers.')).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Review answers' })).toHaveCount(0);
    await expect(page.getByText('Saving…', { exact: true }).first()).toBeVisible();
  } finally { release(); adapter.holdWrites = undefined; }
  await waitForAllSaved(page);
  await expect(panel.getByText('9 of 10')).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Continue' })).toBeVisible();
  expect(adapter.unexpected).toEqual([]);
});

test('drafting mobile first input is above the fold; desktop/mobile screenshots retain the workspace hierarchy', async ({ page }) => {
  const adapter = await installSyntheticApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await signInSynthetic(page);
  await waitForSavedAssessment(page);
  const bounds = await page.locator('#CP-01-text').boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expectMobileTouchTargets(page);
  await page.screenshot({ path: 'test-results/cmp-issuer-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
  await page.screenshot({ path: 'test-results/cmp-issuer-desktop.png', fullPage: true });
  expect(adapter.unexpected).toEqual([]);
});
