import { defineConfig } from '@playwright/test';

/*
 * ADDITIONAL synthetic-adapter UI suites (30 September 2026) — separate from
 * the real-stack suite (playwright.config.ts + `npm run test:browser`).
 * Runs the mock UI specs (tests/ui-milestone.spec.ts, tests/ui-guidance.spec.ts)
 * against the local Vite dev server on loopback with the installed Chrome
 * (channel "chrome"). The port is the optional CMP_UI_PORT (default 55473,
 * the historical prior-worktree port); run this worktree's suite on a free
 * port via `CMP_UI_PORT=55483 npm run test:ui`. reuseExistingServer:true so
 * it attaches to an already-running dev/preview server when present. Every
 * Supabase response in these suites is a mock (see the MOCK DISCLOSURE inside
 * each spec): no real database, no RLS proof, no credentials, no hosted
 * writes.
 */
const port = process.env.CMP_UI_PORT ?? '55473';
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  testMatch: '**/ui-*.spec.ts',
  timeout: 60000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    channel: 'chrome',
    trace: 'off',
    screenshot: 'off',
    // The app honours prefers-reduced-motion and controls animate only
    // color/transform properties; reduced motion keeps post-resize height
    // measurements deterministic.
    contextOptions: { reducedMotion: 'reduce' },
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: true,
  },
});
