import { chromium } from "@playwright/test";
import fs from "node:fs";

const enabled = JSON.parse(fs.readFileSync(new URL("../../src/lib/generated/enabled-sample.json", import.meta.url), "utf8"));
const TYPE_BY_CONTROL = { date: 'date', 'yes-no': 'yes_no_details', narrative: 'narrative', 'conditional-text': 'text_na', text: 'text', select: 'select', currency: 'currency', currency_date: 'currency_date' };
const USER_ID = '11111111-1111-4111-8111-111111111111';
const COMPANY_ID = '22222222-2222-4222-8222-222222222222';
const COMPANY = { id: COMPANY_ID, owner_user_id: USER_ID, name: 'Synthetic Adapter Company', created_at: '2026-09-30T08:00:00+00:00', updated_at: '2026-09-30T08:00:00+00:00' };
const SYNTHETIC_USER = { id: USER_ID, aud: 'authenticated', role: 'authenticated', email: 'adapter.tester@example.test', is_anonymous: false };
const checklistRows = enabled.sections.flatMap((s) => s.items.map((i) => ({
  id: i.id, title: i.shortLabel, question_text: i.prompt, field_type: TYPE_BY_CONTROL[i.control], allows_na: i.allowsNa,
  party_key: 'issuer', phase_order: s.phaseOrder, display_order: i.displayOrder, source_reference: i.sourceRef,
  select_options: i.selectOptions ?? null, sample_version: enabled.sampleVersion, is_active: true, created_at: '2026-09-30T08:00:00+00:00',
})));

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
await page.route('**/rest/v1/**', async (route) => {
  const url = new URL(route.request().url());
  const table = url.pathname.split('/rest/v1/')[1];
  const method = route.request().method();
  const json = (b, s = 200) => route.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(b) });
  if (table === 'company_account') return json([COMPANY]);
  if (table === 'checklist_item') return json(checklistRows);
  if (table === 'assessment_answer' && method === 'GET') return json([]);
  if (table === 'assessment_answer' && method === 'POST') return json({ message: 'Synthetic outage' }, 503);
  return route.abort('failed');
});
await page.route('**/auth/v1/user*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SYNTHETIC_USER) }));

await page.goto('http://127.0.0.1:55473/');
const seg = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const jwt = `${seg({ alg: 'none', typ: 'JWT' })}.${seg({ sub: USER_ID, aud: 'authenticated', role: 'authenticated', email: SYNTHETIC_USER.email, iat: now, exp: now + 86400 })}.${Buffer.from('synthetic-adapter-signature').toString('base64url')}`;
await page.evaluate(async (token) => {
  const m = await import('/src/lib/supabase-client.ts');
  await m.getSupabaseClient().auth.setSession({ access_token: token, refresh_token: 'synthetic-adapter-refresh' });
}, jwt);
await page.waitForSelector('#CP-01-text');
await page.getByRole('button', { name: /Business/ }).first().click();
await page.waitForSelector('#Q-BUS-01-narrative');
await page.locator('#Q-BUS-01-narrative').fill('x');
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
const out = await page.evaluate(() => {
  const rows = [];
  for (const el of document.querySelectorAll('button')) {
    const r = el.getBoundingClientRect();
    if (r.width > 0) rows.push({ text: el.textContent?.trim().slice(0, 30), h: Math.round(r.height), cls: el.className.match(/h-\d+/g)?.join(' ') });
  }
  return { innerWidth: window.innerWidth, matchSm: matchMedia('(min-width: 40rem)').matches, rows: rows.filter(r => r.h < 44) };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
