import { defineConfig } from '@playwright/test';

/*
 * ADDITIONAL synthetic-adapter UI suite (30 September 2026) — separate from
 * the real-stack suite (playwright.config.ts + `npm run test:browser`).
 * Runs only tests/ui-milestone.spec.ts against the local Vite dev server on
 * loopback port 55473 with the installed Chrome (channel "chrome").
 * reuseExistingServer:true so it attaches to an already-running 55473 dev/
 * preview server when present. Every Supabase response in this suite is a
 * mock (see the MOCK DISCLOSURE inside the spec): no real database, no RLS
 * proof, no credentials, no hosted writes.
 */
export default defineConfig({
  testDir: './tests',
  testMatch: '**/ui-milestone.spec.ts',
  timeout: 60000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:55473',
    channel: 'chrome',
    trace: 'off',
    screenshot: 'off',
    // The app honours prefers-reduced-motion and controls animate only
    // color/transform properties; reduced motion keeps post-resize height
    // measurements deterministic.
    contextOptions: { reducedMotion: 'reduce' },
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 55473 --strictPort',
    url: 'http://127.0.0.1:55473',
    reuseExistingServer: true,
  },
});
