import { test, expect, type Page } from '@playwright/test';
const inbox = process.env.DARAJA_MAILPIT_URL ?? 'http://127.0.0.1:55324';
const email = () => `browser-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
async function requestLink(page: Page, address: string) {
  await page.getByLabel('Email address', { exact: true }).fill(address);
  await page.getByRole('button', { name: 'Send sign-in link', exact: true }).click();
  await expect(page.getByText(`Link sent to ${address}`, { exact: false })).toBeVisible();
  let id: string | undefined;
  await expect.poll(async () => {
    const list = await (await page.request.get(`${inbox}/api/v1/messages`)).json();
    id = list.messages?.find((m: any) => m.To?.some((r: any) => r.Address === address))?.ID;
    return !!id;
  }).toBe(true);
  const message = await (await page.request.get(`${inbox}/api/v1/message/${id}`)).json();
  const link = message.HTML.match(/href="([^"]*\/auth\/v1\/verify[^\"]*)"/)?.[1];
  expect(link).toBeTruthy();
  return link.replaceAll('&amp;', '&');
}
async function login(page: Page, address = email()) {
  await page.goto('/');
  const link = await requestLink(page, address);
  await page.goto(link);
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  return { address, link };
}
async function onboard(page: Page, name: string) {
  await page.getByLabel('Company name', { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Create company', exact: true }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
  await expect(page.getByText('No saved entries yet.', { exact: true })).toBeVisible();
}

test('real email link, typed save, saved-only score, reload, failure/retry, signout warning and second account', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await login(page); await onboard(page, 'Synthetic Browser A');
  await expect(page.getByText('No saved answer', { exact: true })).toHaveCount(4);
  await page.locator('#CP-07-saved-date').fill('1995-06-15');
  await page.locator('input[name="CP-07-saved-readiness"][value="ready"]').check();
  await page.locator('input[name="Q-DIR-01-saved-yesno"][value="no"]').check();
  await page.locator('input[name="Q-DIR-01-saved-readiness"][value="ready"]').check();
  await page.locator('input[name="Q-OFR-03-saved-readiness"][value="na"]').check();
  await page.locator('#Q-OFR-03-saved-na-reason').fill('Synthetic domestic listing');
  await expect(page.getByText('0.00%', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save changes', exact: true }).first().click();
  await expect(page.getByText('66.67%', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('#CP-07-saved-date')).toHaveValue('1995-06-15');
  await expect(page.getByText('66.67%', { exact: true })).toBeVisible();
  await page.locator('#Q-ISS-01-saved-narrative').fill('Synthetic objects draft');
  await page.route('**/rest/v1/assessment_answer*', route => route.request().method() === 'POST' ? route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Synthetic outage"}' }) : route.continue());
  await page.getByRole('button', { name: 'Save changes', exact: true }).first().click();
  await expect(page.getByText('Save failed', { exact: true })).toBeVisible();
  await expect(page.locator('#Q-ISS-01-saved-narrative')).toHaveValue('Synthetic objects draft');
  await page.unroute('**/rest/v1/assessment_answer*');
  await page.getByRole('button', { name: 'Retry Q-ISS-01', exact: true }).click();
  await expect(page.getByText('All changes saved', { exact: true })).toBeVisible();
  await page.locator('#Q-ISS-01-saved-narrative').fill('Unsaved text');
  page.once('dialog', d => d.dismiss());
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.locator('#Q-ISS-01-saved-narrative')).toHaveValue('Unsaved text');
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByLabel('Email address', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Email address', { exact: true })).toBeVisible();
  await login(page); await onboard(page, 'Synthetic Browser B');
  await expect(page.getByText('Synthetic Browser A', { exact: true })).toHaveCount(0);
  await expect(page.locator('#CP-07-saved-date')).toHaveValue('');
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/assessment-${width}.png`, fullPage: true });
  }
  expect(errors).toEqual([]);
});

test('invalid and hash-error callback recovery; request failure is retryable', async ({ page }) => {
  await page.goto('/?code=invalid-code');
  await expect(page.getByRole('alert')).toContainText('Request a new link');
  expect(new URL(page.url()).searchParams.has('code')).toBe(false);
  await page.goto('/?callback=expired#error=access_denied&error_code=otp_expired');
  await expect(page.getByRole('alert')).toContainText('Request a new link');
  expect(page.url()).not.toContain('error=');
  await page.route('**/auth/v1/otp*', route => route.fulfill({ status: 429, contentType: 'application/json', body: '{"code":"over_email_send_rate_limit","message":"Too many"}' }));
  await page.getByLabel('Email address').fill(email());
  await page.getByRole('button', { name: 'Send sign-in link' }).click();
  await expect(page.getByText('Too many sign-in links were requested.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send sign-in link' })).toBeEnabled();
});

test('a real link opened in another browser fails clearly', async ({ page, browser }) => {
  await page.goto('/'); const link = await requestLink(page, email());
  const other = await browser.newContext(); const otherPage = await other.newPage();
  await otherPage.goto(link);
  await expect(otherPage.getByRole('alert')).toContainText('Request a new link');
  await expect(otherPage.getByRole('button', { name: 'Sign out', exact: true })).toHaveCount(0);
  await other.close();
});

test('late onboarding and save responses cannot replace a different account', async ({ page, browser }) => {
  await login(page);
  const otherContext = await browser.newContext(); const other = await otherContext.newPage();
  await other.goto('http://localhost:5173');
  const link = await requestLink(other, email()); await other.goto(link);
  await expect(other.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  await onboard(other, 'Synthetic Switch B');
  const sessionB = await other.evaluate(async () => {
    const module = await import('/src/lib/supabase-client.ts');
    const { data } = await module.getSupabaseClient().auth.getSession();
    return { access_token: data.session.access_token, refresh_token: data.session.refresh_token };
  });
  let release!: () => void;
  let intercepted = false;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/rest/v1/company_account*', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    const response = await route.fetch(); intercepted = true;
    await gate; await route.fulfill({ response });
  });
  await page.getByLabel('Company name', { exact: true }).fill('Synthetic Late A');
  await page.getByRole('button', { name: 'Create company', exact: true }).click();
  await expect.poll(() => intercepted).toBe(true);
  await page.evaluate(async session => {
    const module = await import('/src/lib/supabase-client.ts');
    await module.getSupabaseClient().auth.setSession(session);
  }, sessionB);
  await expect(page.getByText('Synthetic Switch B', { exact: true })).toBeVisible();
  release();
  await expect(page.getByText('Synthetic Late A', { exact: true })).toHaveCount(0);
  await page.unroute('**/rest/v1/company_account*');

  // Hold a server-confirmed B answer while switching to a new account C.
  await other.getByRole('button', { name: 'Sign out', exact: true }).click();
  const linkC = await requestLink(other, email()); await other.goto(linkC);
  await onboard(other, 'Synthetic Switch C');
  const sessionC = await other.evaluate(async () => {
    const module = await import('/src/lib/supabase-client.ts');
    const { data } = await module.getSupabaseClient().auth.getSession();
    return { access_token: data.session.access_token, refresh_token: data.session.refresh_token };
  });
  let releaseSave!: () => void; let saving = false; let postCount = 0;
  const saveGate = new Promise<void>(resolve => { releaseSave = resolve; });
  await page.route('**/rest/v1/assessment_answer*', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    postCount++; const response = await route.fetch(); saving = true;
    await saveGate; await route.fulfill({ response });
  });
  await page.locator('#CP-07-saved-date').fill('2000-01-01');
  await page.locator('#Q-ISS-01-saved-narrative').fill('Must not save for C');
  await page.getByRole('button', { name: 'Save changes', exact: true }).first().click();
  await expect.poll(() => saving).toBe(true);
  await page.evaluate(async session => {
    const module = await import('/src/lib/supabase-client.ts');
    await module.getSupabaseClient().auth.setSession(session);
  }, sessionC);
  await expect(page.getByText('Synthetic Switch C', { exact: true })).toBeVisible();
  releaseSave();
  await expect(page.locator('#CP-07-saved-date')).toHaveValue('');
  await expect(page.locator('#Q-ISS-01-saved-narrative')).toHaveValue('');
  await expect(page.getByText('No saved entries yet.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('#CP-07-saved-date')).toHaveValue('');
  expect(postCount).toBe(1);
  await otherContext.close();
});

test('expired session with revoked refresh clears the workspace and explains recovery', async ({ page }) => {
  await login(page); await onboard(page, 'Synthetic Expiry');
  await page.clock.setFixedTime(new Date(Date.now() + 2 * 60 * 60 * 1000));
  await page.route('**/auth/v1/token*', route => route.fulfill({ status: 401, contentType: 'application/json', body: '{"code":"refresh_token_not_found","msg":"Invalid refresh token"}' }));
  await page.evaluate(async () => {
    const module = await import('/src/lib/supabase-client.ts');
    await module.getSupabaseClient().auth.refreshSession();
  });
  await expect(page.getByText('Your session has ended. Please sign in again.', { exact: true })).toBeVisible();
  await expect(page.getByText('Synthetic Expiry', { exact: true })).toHaveCount(0);
});
