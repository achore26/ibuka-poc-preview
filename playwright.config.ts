import { defineConfig } from '@playwright/test';

/*
 * Real-stack integration suite (tests/assessment.spec.ts via `npm run test:browser`,
 * wrapped by tests/run-local.mjs which injects the local Supabase URL/publishable
 * key from `supabase status` of the companion DB worktree).
 *
 * This config starts its OWN Vite dev server on loopback with the REAL local
 * Supabase configuration — it must never attach to the mock-preview dev server
 * that serves the synthetic UI suite on port 55473 (playwright.ui.config.ts),
 * and `reuseExistingServer: false` + `--strictPort` make an accidental attach
 * or a silent port shift fail loudly instead.
 *
 * Port: 5173 by default because the local Supabase Auth redirect allowlist
 * (supabase/config.toml in the DB worktree) permits exactly localhost:5173 and
 * 127.0.0.1:5173. DARAJA_TEST_PORT may override it for coordination, but any
 * other port ALSO needs the exact local callback URL added to the DB worktree's
 * additional_redirect_urls first — otherwise magic-link callbacks are rejected.
 */
const port = Number(process.env.DARAJA_TEST_PORT ?? 5173);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './tests', timeout: 60000, workers: 1, reporter: 'list',
  use: { baseURL, channel: 'chrome', trace: 'off', screenshot: 'off' },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
  },
  // The real-stack suite keeps its own command/config; the synthetic-adapter
  // UI suite is additional and runs only through playwright.ui.config.ts
  // (`npm run test:ui`).
  testIgnore: '**/ui-milestone.spec.ts',
});
