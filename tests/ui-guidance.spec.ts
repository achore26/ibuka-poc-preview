/*
 * Selected-question guidance + test-workspace regressions (CMP Kenya,
 * 30 September 2026). ADDITIONAL mock suite — runs via `npm run test:ui`
 * (playwright.ui.config.ts) beside tests/ui-milestone.spec.ts, strictly
 * separate from the real-stack suite (`npm run test:browser`).
 *
 * MOCK DISCLOSURE — READ BEFORE TRUSTING THESE TESTS: every Supabase
 * REST/auth response below is served by a synthetic in-memory adapter
 * installed with page.route (PostgREST-shaped company/checklist/answer rows
 * plus a fabricated non-expired session JWT), and any request the adapter
 * does not explicitly expect is REJECTED, never forwarded, so the fixtures
 * can neither contact nor write the hosted project. These tests verify
 * FRONTEND WIRING ONLY: rendered guidance for the ten enabled questions,
 * aria-describedby targets, expanded CP-13 option labels with EXACT stored
 * values, the shared status explanation, the persistent Test workspace
 * banner, layout overflow and the autosave flow. They are NOT proof of
 * row-level security, database constraints, real token exchange or any
 * hosted integration; the real-stack suite owns that evidence.
 *
 * The fail-closed project-URL guard itself is verified by the UNIT suite
 * (src/lib/project-url-guard.test.ts, run by npm test), not here.
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
  name: 'Synthetic Guidance Company',
  created_at: '2026-09-30T08:00:00+00:00',
  updated_at: '2026-09-30T08:00:00+00:00',
};
const SYNTHETIC_USER = {
  id: USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'guidance.tester@example.test',
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

interface CapturedWrite {
  itemId: string;
  body: Record<string, unknown>;
}

interface Adapter {
  writes: CapturedWrite[];
  /** Requests the adapter does not model — must stay empty; never forwarded. */
  unexpected: string[];
  companyExists: boolean;
}

async function installSyntheticApi(page: Page): Promise<Adapter> {
  const adapter: Adapter = { writes: [], unexpected: [], companyExists: true };
  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  await page.route('**/rest/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const table = url.pathname.split('/rest/v1/')[1];
    const method = route.request().method();
    const eq = (key: string) => (url.searchParams.get(key) ?? '').replace(/^eq\./, '');

    if (table === 'company_account' && method === 'GET') {
      return json(route, adapter.companyExists ? [COMPANY] : []);
    }
    if (table === 'checklist_item' && method === 'GET') return json(route, checklistRows);

    if (table === 'assessment_answer') {
      if (method === 'GET') return json(route, []);
      const body = route.request().postDataJSON() as Record<string, unknown>;
      adapter.writes.push({ itemId: String(body.item_id ?? eq('item_id')), body });
      const row = { company_id: COMPANY_ID, updated_at: new Date().toISOString(), ...body };
      if (method === 'POST') return json(route, row);
      return json(route, { ...row, item_id: eq('item_id') });
    }

    adapter.unexpected.push(`${method} ${url.pathname}${url.search}`);
    return route.abort('failed');
  });

  await page.route('**/auth/v1/user*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SYNTHETIC_USER) }),
  );
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
  const segment = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const signature = Buffer.from('synthetic-adapter-signature').toString('base64url');
  return `${segment({ alg: 'none', typ: 'JWT' })}.${segment({
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

/** Switch the one-visible-section form to the given group on any viewport. */
async function openSection(page: Page, key: string, title: string) {
  const selector = page.locator('#section-select');
  if (await selector.isVisible()) {
    await selector.selectOption(key);
  } else {
    await page.getByRole('button', { name: new RegExp(title) }).first().click();
  }
}

const CONTROL_ID_SUFFIX: Record<string, string> = {
  text: 'text',
  date: 'date',
  select: 'MIMS',
  currency: 'amount',
  currency_date: 'amount',
  narrative: 'narrative',
};

/** Every aria-describedby target of a control exists exactly once and renders. */
async function expectDescribedByResolves(page: Page, controlId: string) {
  const described = await page.locator(`#${controlId}`).getAttribute('aria-describedby');
  expect(described, `${controlId} must reference its guidance`).toBeTruthy();
  for (const id of described!.split(/\s+/).filter(Boolean)) {
    const count = await page.locator(`[id="${id}"]`).count();
    expect(count, `${controlId} describedby target ${id} must exist exactly once`).toBe(1);
    await expect(page.locator(`#${id}`)).toBeVisible();
  }
}

test.describe('guidance and test-workspace wiring', () => {
  test('anonymous preview: banner states the test database, all 10 helpers visible across 4 sections', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('#CP-01-text')).toBeVisible();

    // Persistent test-workspace banner with the signed-out clarification.
    const banner = page.getByRole('note', { name: 'Test workspace' });
    await expect(banner).toBeVisible();
    await expect(banner.getByText('Use fictional company data. Preview entries are not saved.')).toBeVisible();

    // Shared status explanation near the form (once, not per card).
    const statusNote = page.locator('details[aria-label="How answer status works"]');
    await statusNote.locator('summary').click();
    await expect(statusNote).toBeVisible();
    await expect(statusNote.getByText(/Draft.+answers may be incomplete/)).toBeVisible();
    await expect(statusNote.getByText(/Ready for review.+means you consider the answer complete for review/)).toBeVisible();
    await expect(statusNote.getByText(/Editing a Ready answer returns it to Draft/)).toBeVisible();
    await expect(page.locator('details[aria-label="How answer status works"]')).toHaveCount(1);

    // Every enabled question's helper is reachable and visible without
    // opening Source, across all four sections.
    for (const section of enabled.sections) {
      await openSection(page, section.key, section.title);
      for (const item of section.items) {
        const help = page.locator(`#${item.id}-help`);
        await expect(help).toBeVisible();
        expect((await help.textContent())!.trim().length).toBeGreaterThan(20);
        // Guidance sits directly below the verbatim prompt, before Source.
        const helpBox = await help.boundingBox();
        const details = page.locator('article', { has: page.locator(`#${item.id}-help`) }).locator('details').first();
        const detailsBox = await details.boundingBox();
        expect(helpBox!.y).toBeLessThan(detailsBox!.y);
        // The verbatim prompt itself is untouched.
        await expect(
          page.locator('article', { has: page.locator(`#${item.id}-help`) }).getByRole('heading', {
            name: item.prompt,
            exact: true,
          }),
        ).toBeVisible();
      }
    }
  });

  test('CP-13: expanded option labels render, both definitions stay visible regardless of selection, stored values exact', async ({
    page,
  }) => {
    const adapter = await installSyntheticApi(page);
    await signInSynthetic(page);
    await expect(page.locator('#CP-01-text')).toBeVisible();

    await openSection(page, 'company', 'Company details');
    const listing = page.locator('#question-CP-13');

    const mims = listing.getByRole('radio', { name: 'MIMS — Main Investment Market Segment', exact: true });
    const smems = listing.getByRole('radio', { name: 'SMEMS — Small and Medium Enterprises Market Segment', exact: true });
    await expect(mims).not.toBeChecked();
    await expect(smems).not.toBeChecked();
    await expect(mims).toHaveValue('MIMS');
    await expect(smems).toHaveValue('SMEMS');
    for (const radio of [smems, mims]) {
      await radio.check();
      await expect(mims).toBeVisible();
      await expect(smems).toBeVisible();
      await expect(listing.locator('#CP-13-note').getByText(/leave this as a Draft and confirm with your adviser/)).toBeVisible();
      const value = await radio.inputValue();
      await expect.poll(() => adapter.writes.filter(write => write.itemId === 'CP-13' && write.body.answer_select === value).length, { timeout: 10_000 }).toBeGreaterThanOrEqual(1);
    }

    expect(adapter.unexpected).toEqual([]);
  });

  test('saved form: helpers + describedby targets on every control; compound amount/date errors keep distinct ids', async ({
    page,
  }) => {
    const adapter = await installSyntheticApi(page);
    await signInSynthetic(page);
    await expect(page.locator('#CP-01-text')).toBeVisible();

    // The banner persists in the signed-in workspace without the preview clause.
    const banner = page.getByRole('note', { name: 'Test workspace' });
    await expect(banner).toBeVisible();
    await expect(banner.getByText('Use fictional company data. Signed-in entries save to the test database.')).toBeVisible();
    await expect(banner.getByText(/Nothing is saved while you are signed out/)).toHaveCount(0);

    for (const section of enabled.sections) {
      await openSection(page, section.key, section.title);
      for (const item of section.items) {
        const suffix = CONTROL_ID_SUFFIX[item.control];
        if (!suffix) continue;
        await expect(page.locator(`#${item.id}-help`)).toBeVisible();
        await expectDescribedByResolves(page, `${item.id}-${suffix}`);
        if (item.control === 'currency_date') {
          await expectDescribedByResolves(page, `${item.id}-as-at`);
        }
      }
    }

    // Compound control: an invalid AMOUNT renders the amount error only, with
    // its OWN id in the amount's describedby; the as-at input keeps guidance
    // only; fixing the amount unmounts the error and restores help-only.
    await openSection(page, 'financial', 'Financial position');
    const assets = page.locator('article', { has: page.locator('#CP-16-amount') });
    await assets.locator('#CP-16-amount').fill('abc');
    await expect(assets.getByText(/Enter a plain number/)).toBeVisible();
    await expect(page.locator('#CP-16-amount-issue')).toHaveCount(1);
    await expect(page.locator('#CP-16-as-at-issue')).toHaveCount(0);
    expect(await page.locator('#CP-16-amount').getAttribute('aria-describedby')).toBe(
      'CP-16-help CP-16-note CP-16-format CP-16-amount-issue',
    );
    expect(await page.locator('#CP-16-as-at').getAttribute('aria-describedby')).toBe('CP-16-help CP-16-note CP-16-format');
    // The CP-16 control note (statement pairing) is part of the description.
    await expect(page.locator('#CP-16-note')).toBeVisible();

    await assets.locator('#CP-16-amount').fill('120000000');
    await expect(page.locator('#CP-16-amount-issue')).toHaveCount(0);
    expect(await page.locator('#CP-16-amount').getAttribute('aria-describedby')).toBe('CP-16-help CP-16-note CP-16-format');

    expect(adapter.unexpected).toEqual([]);
  });

  test('banner covers onboarding; save status flow still autosaves with guidance mounted', async ({ page }) => {
    const adapter = await installSyntheticApi(page);
    adapter.companyExists = false;
    await signInSynthetic(page);

    // Onboarding state: the shared banner is still visible.
    const banner = page.getByRole('note', { name: 'Test workspace' });
    await expect(banner).toBeVisible();
    await expect(banner.getByText('Use fictional company data. Signed-in entries save to the test database.')).toBeVisible();
    await expect(page.getByLabel('Test company display name', { exact: true })).toBeVisible();

    // Then through to the saved assessment: an edit still autosaves and the
    // saved-state chip flow is unchanged with guidance on the page.
    adapter.companyExists = true;
    await page.reload();
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
    await expect(page.locator('#CP-01-text')).toBeVisible();
    await page.locator('#CP-01-text').fill('Synthetic Guidance Name Ltd');
    await expect
      .poll(() => adapter.writes.filter((write) => write.itemId === 'CP-01').length, { timeout: 10_000 })
      .toBeGreaterThanOrEqual(1);
    expect(adapter.writes.find((write) => write.itemId === 'CP-01')!.body.answer_text).toBe(
      'Synthetic Guidance Name Ltd',
    );
    await expect(
      page.getByText(/All changes saved/).first(),
    ).toBeVisible();

    expect(adapter.unexpected).toEqual([]);
  });

  test('desktop 1440 and mobile 390: no overflow, mobile actions >=44px with guidance mounted', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('#CP-01-text')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
    await page.getByText('Preview tools', { exact: true }).click();
    await page.getByRole('button', { name: 'Load worked example (sample)' }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    for (const section of enabled.sections) {
      await openSection(page, section.key, section.title);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
      const clippedNavigation = await page.getByRole('navigation', { name: 'Section navigation' }).evaluate(nav => Array.from(nav.querySelectorAll('button')).filter(button => {
        const b = button.getBoundingClientRect(), n = nav.getBoundingClientRect();
        return b.right > n.right || b.left < n.left || button.scrollWidth > button.clientWidth || button.scrollHeight > button.clientHeight;
      }).map(button => button.textContent));
      expect(clippedNavigation).toEqual([]);
    }
    const shortTargets = await page.evaluate(() => {
      const out: { text: string; height: number }[] = [];
      const visible = (el: HTMLElement) => {
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        if (typeof el.checkVisibility === 'function' && !el.checkVisibility()) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };
      for (const el of Array.from(document.querySelectorAll<HTMLElement>('button, summary'))) {
        if (!visible(el)) continue;
        const rect = el.getBoundingClientRect();
        if (rect.height < 44) out.push({ text: (el.textContent || '').trim().slice(0, 40), height: Math.round(rect.height) });
      }
      return out;
    });
    expect(shortTargets, JSON.stringify(shortTargets)).toEqual([]);
  });
});

test('financial working document: answer column, quiet guidance, paired inputs and integrated rail progress', async ({ page }) => {
  const adapter = await installSyntheticApi(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInSynthetic(page);
  await openSection(page, 'financial', 'Financial position');
  const paidUp = page.locator('#question-SC-03');
  const assets = page.locator('#question-CP-16');
  await expect(paidUp.locator('#SC-03-help')).toBeVisible();
  await expect(paidUp.getByText(/Plain number in full units/)).toBeHidden();
  await expect(paidUp.locator('#SC-03-amount')).toHaveAttribute('placeholder', 'Enter amount');
  await expect(paidUp.locator('#SC-03-missing')).toHaveCount(0);
  await expect(paidUp.getByRole('button', { name: 'Mark ready for review' })).toBeDisabled();
  await expect(paidUp.getByRole('button', { name: 'Mark ready for review' })).toHaveAttribute('data-variant', 'outline');
  const headingSize = await paidUp.locator('#SC-03-prompt').evaluate(el => Number.parseFloat(getComputedStyle(el).fontSize));
  const helpSize = await paidUp.locator('#SC-03-help').evaluate(el => Number.parseFloat(getComputedStyle(el).fontSize));
  expect(headingSize).toBeGreaterThan(helpSize);
  await expect(page.locator('.assessment-document')).toHaveCSS('box-shadow', 'none');
  const titleSize = await page.getByRole('heading', { name: 'Financial position', exact: true }).evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  expect(titleSize).toBe(40);
  const promptBox = await paidUp.locator('#SC-03-prompt').boundingBox();
  const inputBox = await paidUp.locator('#SC-03-amount').boundingBox();
  expect(inputBox!.x).toBeGreaterThan(promptBox!.x + promptBox!.width);
  expect(inputBox!.height).toBeGreaterThanOrEqual(52);
  await expect(page.locator('#rail-progress').getByRole('complementary', { name: 'Assessment progress' })).toBeVisible();
  await expect(paidUp.getByText('Not started', { exact: true })).toHaveCount(0);
  await expect(paidUp.getByText('Full units · no commas or symbols · 0 is valid')).toBeVisible();
  const amountBox = await assets.locator('#CP-16-amount').boundingBox();
  const dateBox = await assets.locator('#CP-16-as-at').boundingBox();
  expect(Math.abs(amountBox!.y - dateBox!.y)).toBeLessThan(2);
  await page.screenshot({ path: 'test-results/cmp-financial-desktop.png', fullPage: true });
  const tips = paidUp.locator('summary', { hasText: 'Guidance and source' });
  await tips.focus(); await page.keyboard.press('Enter');
  await expect(paidUp.getByText(/Plain number in full units/)).toBeVisible();
  await paidUp.locator('#SC-03-amount').fill('abc');
  await expect(paidUp.locator('#SC-03-amount-issue')).toBeVisible();
  await expectDescribedByResolves(page, 'SC-03-amount');
  expect(adapter.writes.filter(write => write.itemId === 'SC-03')).toEqual([]);
  await page.screenshot({ path: 'test-results/cmp-financial-error-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => Array.from(document.querySelectorAll('body *')).filter(el => el.checkVisibility() && el.getBoundingClientRect().right > 390).map(el => ({ tag: el.tagName, cls: el.className, right: el.getBoundingClientRect().right, text: el.textContent?.slice(0, 55) })));
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth), { message: JSON.stringify(overflow) }).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/cmp-financial-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSection(page, 'business', 'Business');
  const narrative = page.locator('#Q-BUS-01-narrative');
  await expect(narrative).toHaveAccessibleName(enabled.sections.find(section => section.key === 'business')!.items[0].prompt);
  expect((await narrative.boundingBox())!.height).toBeGreaterThanOrEqual(180);
  await page.screenshot({ path: 'test-results/cmp-business-desktop.png', fullPage: true });
  expect(adapter.unexpected).toEqual([]);
});
