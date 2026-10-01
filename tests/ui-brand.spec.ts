/*
 * Brand integration checks (CMP Kenya brand pass, 1 October 2026).
 * ADDITIONAL suite — runs via `npm run test:ui` beside ui-milestone and
 * ui-guidance. It verifies ONLY the supplied-identity integration:
 * byte-exact artwork served from this origin, self-hosted fonts with no
 * external requests, guideline clear space/minimum sizes, computed
 * colour contrast pairs, and font-ready screenshots.
 *
 * MOCK DISCLOSURE: the signed-in scenarios use the same synthetic
 * in-memory PostgREST-shaped adapter pattern as the other ui-* suites
 * (any unmodelled request is rejected, never forwarded) — no database,
 * credentials or hosted writes are involved. These tests prove frontend
 * presentation only, not auth, RLS or persistence.
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
  name: 'Synthetic Brand Company',
  created_at: '2026-10-01T08:00:00+00:00',
  updated_at: '2026-10-01T08:00:00+00:00',
};
const SYNTHETIC_USER = {
  id: USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'brand.tester@example.test',
  email_confirmed_at: '2026-10-01T08:00:00+00:00',
  confirmed_at: '2026-10-01T08:00:00+00:00',
  last_sign_in_at: '2026-10-01T08:00:00+00:00',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  identities: [],
  created_at: '2026-10-01T08:00:00+00:00',
  updated_at: '2026-10-01T08:00:00+00:00',
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
    created_at: '2026-10-01T08:00:00+00:00',
  })),
);

async function installSyntheticApi(page: Page, companyExists = true) {
  const unexpected: string[] = [];
  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  await page.route('**/rest/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const table = url.pathname.split('/rest/v1/')[1];
    const method = route.request().method();
    if (table === 'company_account' && method === 'GET') {
      return json(route, companyExists ? [COMPANY] : []);
    }
    if (table === 'checklist_item' && method === 'GET') return json(route, checklistRows);
    if (table === 'assessment_answer') {
      if (method === 'GET') return json(route, []);
      const body = route.request().postDataJSON() as Record<string, unknown>;
      return json(route, { company_id: COMPANY_ID, updated_at: new Date().toISOString(), ...body });
    }
    unexpected.push(`${method} ${url.pathname}${url.search}`);
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
  return unexpected;
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

/** WCAG contrast of an element's computed colour against its effective background. */
const CONTRAST_PROBE = `(selector, pseudo) => {
  const el = document.querySelector(selector);
  if (!el) return { selector, error: 'missing ' + selector };
  const styles = getComputedStyle(el, pseudo || null);
  const fg = styles.color;
  let node = el;
  let bg = 'rgba(0, 0, 0, 0)';
  while (node) {
    bg = getComputedStyle(node).backgroundColor;
    if (bg && !bg.endsWith(', 0)')) break;
    node = node.parentElement;
  }
  const parse = (value) => value.match(/rgba?\\(([^)]+)\\)/)[1].split(',').map(Number);
  const lum = (value) => {
    const [r, g, b] = parse(value).map((channel) => {
      const scaled = channel <= 255 * 0.03928 ? channel / (255 * 12.92) : Math.pow((channel / 255 + 0.055) / 1.055, 2.4);
      return scaled;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  return { selector, fg, bg, ratio: Math.round(ratio(fg, bg) * 100) / 100 };
}`;

const HORIZONTAL_RATIO = 106 / 309.9914285714286;

test('artwork and fonts are exact local files; no external requests; identity sizing and clear space', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('#CP-01-text')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  // Every request stayed on this loopback origin (fonts/branding included).
  const external = requests.filter((url) => !url.startsWith(`http://127.0.0.1:${new URL(page.url()).port}/`));
  expect(external, JSON.stringify(external)).toEqual([]);

  // Served artwork is byte-identical to the committed public/ files.
  for (const file of [
    '/favicon.svg',
    '/brand/cmp-kenya_logo_horizontal_primary.svg',
    '/brand/cmp-kenya_logo_horizontal_reversed.svg',
    '/brand/cmp-kenya_icon_primary.svg',
    '/brand/cmp-kenya_icon_reversed.svg',
    '/fonts/montserrat-latin.woff2',
    '/fonts/source-sans-3-latin.woff2',
  ]) {
    const response = await page.request.get(file);
    expect(response.status(), file).toBe(200);
    const served = Buffer.from(await response.body());
    const committed = fs.readFileSync(new URL('../public' + file, import.meta.url));
    expect(served.equals(committed), file).toBe(true);
  }

  // Brand typefaces actually loaded locally.
  expect(await page.evaluate(() => document.fonts.check('600 16px Montserrat'))).toBe(true);
  expect(await page.evaluate(() => document.fonts.check('400 16px "Source Sans 3"'))).toBe(true);

  // Rail logo: >= 120px wide, root-ratio height, labelled once, and the
  // §3.4 clear space (half displayed icon height = 0.1452 x width) holds.
  const railLogo = page.locator('nav[aria-label="Assessment sections"] img[alt="CMP Kenya"]');
  await expect(railLogo).toBeVisible();
  const railBox = await railLogo.evaluate((img) => {
    const r = img.getBoundingClientRect();
    const p = img.parentElement!.getBoundingClientRect();
    return {
      alt: img.alt,
      natural: img.naturalWidth > 0,
      width: r.width,
      height: r.height,
      left: r.left - p.left,
      top: r.top - p.top,
      bottom: p.bottom - r.bottom,
    };
  });
  expect(railBox.alt).toBe('CMP Kenya');
  expect(railBox.natural).toBe(true);
  expect(railBox.width).toBeGreaterThanOrEqual(120);
  expect(Math.abs(railBox.height - railBox.width * HORIZONTAL_RATIO)).toBeLessThan(1.5);
  const railClear = railBox.width * (90 / 309.9914285714286) / 2;
  expect(railBox.top).toBeGreaterThanOrEqual(railClear - 0.5);
  expect(railBox.bottom).toBeGreaterThanOrEqual(railClear - 0.5);
  expect(railBox.left).toBeGreaterThanOrEqual(railClear - 0.5);

  // The desktop identity is not doubled: exactly one accessible brand name.
  expect(await page.getByRole('img', { name: 'CMP Kenya', exact: true }).count()).toBe(1);

  // Theme tokens applied where promised.
  expect(await page.locator('nav[aria-label="Assessment sections"]').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(11, 37, 69)');
  const saveButton = page.getByRole('button', { name: 'Sign in to save', exact: true });
  await expect(saveButton).toBeVisible();
  expect(await saveButton.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(10, 122, 83)');
  expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain('Source Sans 3');
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('h1')!).fontFamily)).toContain('Montserrat');

  await page.screenshot({ path: 'test-results/brand/preview-desktop-1440.png' });
});

test('contrast evidence: computed foreground/background pairs meet AA', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('#CP-01-text')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const pairs: Array<{ label: string; selector: string; min: number }> = [
    { label: 'h1 Portal Navy on Mist canvas', selector: 'h1', min: 4.5 },
    { label: 'panel summary text on white card', selector: 'details.panel > summary', min: 4.5 },
    { label: 'primary button label at rest', selector: '[data-slot="button"][data-variant="default"]', min: 4.5 },
    { label: 'rail nav text on rail surface', selector: 'nav[aria-label="Assessment sections"] button', min: 4.5 },
    { label: 'rail footer context text on navy', selector: 'nav[aria-label="Assessment sections"] p:last-of-type', min: 4.5 },
    { label: 'test-workspace banner label on white', selector: '[role="note"][aria-label="Test workspace"] span', min: 4.5 },
  ];
  const results: Array<{ label: string; fg: string; bg: string; ratio: number }> = [];
  for (const pair of pairs) {
    const result = await page.evaluate(
      ({ probe, selector, pseudo }) => eval(probe)(selector, pseudo),
      { probe: `(${CONTRAST_PROBE})`, selector: pair.selector, pseudo: pair.pseudo ?? '' },
    );
    expect(result.error ?? '', pair.label).toBe('');
    results.push({ label: pair.label, fg: result.fg, bg: result.bg, ratio: result.ratio });
    expect(result.ratio, `${pair.label}: ${result.fg} on ${result.bg}`).toBeGreaterThanOrEqual(pair.min);
  }
  console.log('BRAND CONTRAST EVIDENCE\n' + results.map((r) => `  ${r.label}: ${r.fg} on ${r.bg} = ${r.ratio}:1`).join('\n'));

  // Hover fill specifically: opaque darker green under a real hover, white
  // label still AA.
  const saveButton = page.getByRole('button', { name: 'Sign in to save', exact: true });
  await saveButton.hover();
  await expect
    .poll(() => saveButton.evaluate((el) => getComputedStyle(el).backgroundColor))
    .toBe('rgb(8, 98, 68)');
  const hoverPair = await page.evaluate(
    ({ probe }) => eval(probe)('[data-slot="button"][data-variant="default"]', ''),
    { probe: `(${CONTRAST_PROBE})` },
  );
  console.log(`BRAND CONTRAST EVIDENCE (hover)  primary button label on hover: ${hoverPair.fg} on ${hoverPair.bg} = ${hoverPair.ratio}:1`);
  expect(hoverPair.ratio).toBeGreaterThanOrEqual(4.5);

  // Exercise a known light-surface button using keyboard modality.
  await saveButton.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(saveButton).toBeFocused();
  await expect.poll(() => saveButton.evaluate(el => el.matches(':focus-visible'))).toBe(true);
  const focus = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const s = getComputedStyle(el);
    return { tag: el.tagName, outline: `${s.outlineColor} ${s.outlineWidth} ${s.outlineStyle}` };
  });
  expect(focus.tag).toBe('BUTTON');
  expect(focus.outline).toMatch(/rgb\((10, 122, 83|92, 196, 154)\)/);
});

test('mobile preview: tagline and descriptor compact and visible, no overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#CP-01-text')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  await expect(page.getByText('Assess. Prepare. List.', { exact: true })).toBeVisible();
  // Exact supplied descriptor, visible once: the hero sentence (the header
  // subtitle copy exists in the DOM but is display:none below 400px).
  await expect(page.getByText('Capital Markets Portal (CMP) Kenya is a Listing Readiness Assessment Toolkit')).toBeVisible();
  expect(await page.locator('.workspace-brand span.truncate').isVisible()).toBe(false);
  expect(await page.title()).toContain('Listing Readiness Assessment Toolkit');

  /*
   * Fold note: on the SIGNED-OUT preview the first typed input sits far
   * below the first 844px viewport even on the pre-brand base (measured
   * 1 October 2026: hero + preview warning + progress block + section
   * heading stack ~1093px before it) — the above-the-fold contract is the
   * SIGNED-IN workspace's and is asserted in the signed-in test below and
   * in tests/ui-milestone.spec.ts. Here the binding brand constraint is
   * that the added tagline/descriptor stay compact: the tagline is one
   * short line and the descriptor sentence adds at most one wrapped line
   * over the previous single description paragraph.
   */
  const taglineBox = await page.getByText('Assess. Prepare. List.', { exact: true }).boundingBox();
  expect(taglineBox!.height).toBeLessThanOrEqual(24);
  const descriptionBox = await page.getByText('Capital Markets Portal (CMP) Kenya is a Listing Readiness Assessment Toolkit').boundingBox();
  expect(descriptionBox!.height).toBeLessThanOrEqual(96);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const icon = page.locator('.workspace-brand img');
  await expect(icon).toBeVisible();
  const iconBox = await icon.evaluate((img) => {
    const r = img.getBoundingClientRect();
    const header = img.closest('header')!.getBoundingClientRect();
    return { width: r.width, height: r.height, alt: img.alt, left: r.left - header.left, top: r.top - header.top, bottom: header.bottom - r.bottom };
  });
  expect(iconBox.alt).toBe('CMP Kenya');
  expect(iconBox.width).toBeGreaterThanOrEqual(120);
  expect(Math.abs(iconBox.height - iconBox.width * HORIZONTAL_RATIO)).toBeLessThan(1);
  const iconClear = iconBox.height / 2;
  expect(iconBox.top).toBeGreaterThanOrEqual(iconClear - 0.5);
  expect(iconBox.bottom).toBeGreaterThanOrEqual(iconClear - 0.5);
  expect(iconBox.left).toBeGreaterThanOrEqual(iconClear - 0.5);

  await page.screenshot({ path: 'test-results/brand/preview-mobile-390.png' });
});

test('320px: header fits with supplied horizontal identity, controls intact, no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await expect(page.locator('#CP-01-text')).toBeVisible();
  const trigger = page.getByRole('button', { name: 'Sign in', exact: true });
  await expect(trigger).toBeVisible();
  expect((await trigger.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  // The long header descriptor is hidden at 320px rather than wrapping;
  // the hero sentence keeps the descriptor available in page copy.
  expect(await page.locator('.workspace-brand span.truncate').isVisible()).toBe(false);
  await expect(page.getByText('Capital Markets Portal (CMP) Kenya is a Listing Readiness Assessment Toolkit')).toBeVisible();
  await page.screenshot({ path: 'test-results/brand/preview-mobile-320.png' });
});

test('signed-in mock workspace: rail logo on desktop, icon beside company context on mobile', async ({ page }) => {
  const unexpected = await installSyntheticApi(page);
  await signInSynthetic(page);
  await expect(page.locator('#CP-01-text')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  // Desktop: identity is the rail logo; company context fills the header.
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('nav[aria-label="Assessment sections"] img[alt="CMP Kenya"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Synthetic Brand Company' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
  await page.screenshot({ path: 'test-results/brand/signed-in-desktop-1440.png' });

  const railButton = page.locator('nav[aria-label="Assessment sections"] button').first();
  await expect(railButton).toBeEnabled();
  await railButton.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  console.log('RAIL FOCUS', await railButton.evaluate(el => ({ active: document.activeElement === el, visible: el.matches(':focus-visible'), disabled: (el as HTMLButtonElement).disabled, tag: document.activeElement?.outerHTML.slice(0,180) })));
  expect(await railButton.evaluate(el => getComputedStyle(el).outlineColor)).toBe('rgb(92, 196, 154)');
  expect(await railButton.evaluate(el => getComputedStyle(el).outlineWidth)).toBe('2px');

  // Mobile: the compact icon stays visible beside the company context.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await expect(page.locator('.workspace-brand img[alt="CMP Kenya"]')).toBeVisible();
  expect(await page.getByRole('img', { name: 'CMP Kenya', exact: true }).count()).toBe(1);
  await expect(page.getByRole('heading', { name: 'Synthetic Brand Company' })).toBeVisible();
  const input = await page.locator('#CP-01-text').boundingBox();
  expect(input!.y + input!.height).toBeLessThanOrEqual(844);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/brand/signed-in-mobile-390.png' });
  expect(unexpected).toEqual([]);
});

test('sign-in dialog and onboarding carry the brand type and colours', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#CP-01-text')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const trigger = page.getByRole('button', { name: 'Sign in', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Start a saved assessment' })).toBeVisible();
  expect(
    await dialog.getByRole('heading', { name: 'Start a saved assessment' }).evaluate((el) => getComputedStyle(el).fontFamily),
  ).toContain('Montserrat');
  const close = dialog.getByRole('button', { name: 'Close' });
  expect((await close.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: 'test-results/brand/sign-in-dialog-390.png' });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);

  // Onboarding keeps the persistent banner and brand header.
  const unexpected = await installSyntheticApi(page, false);
  await signInSynthetic(page);
  await expect(page.getByLabel('Test company display name', { exact: true })).toBeVisible();
  await expect(page.getByRole('note', { name: 'Test workspace' })).toBeVisible();
  await expect(page.locator('.workspace-brand img[alt="CMP Kenya"]')).toBeVisible();
  expect(await page.getByRole('img', { name: 'CMP Kenya', exact: true }).count()).toBe(1);
  await page.screenshot({ path: 'test-results/brand/onboarding-mobile-390.png' });
  expect(unexpected).toEqual([]);
});
