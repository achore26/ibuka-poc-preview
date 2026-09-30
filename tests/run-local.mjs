import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';

/*
 * Real-stack browser test runner (tests/assessment.spec.ts). Reads the LOCAL
 * Supabase status (never hosted credentials) from the companion DB worktree
 * and passes the public URL + publishable key to the Vite dev server started
 * by Playwright's webServer — the values live only in this subprocess env.
 *
 * DARAJA_DB_WORKTREE selects the DB worktree (default: the recovery-era path).
 * DARAJA_TEST_PORT optionally moves the app off 5173 (see playwright.config.ts
 * for the redirect-allowlist coordination that any other port requires).
 */
const args = process.argv.slice(2);
const dbFlagAt = args.indexOf('--db');
const dbFlag = dbFlagAt !== -1 ? args.splice(dbFlagAt, 2)[1] : undefined;
const db = dbFlag ?? process.env.DARAJA_DB_WORKTREE ?? path.resolve('../ibuka-recovery-db');
const c = JSON.parse(execFileSync('supabase', ['status', '--output', 'json'], { cwd: db, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));

// Refuse anything that is not loopback: this suite must exercise the local
// stack only, and an accidental hosted URL would send synthetic traffic (and
 // link callbacks) to a real project.
function assertLoopback(raw, label) {
  let host;
  try { host = new URL(raw).hostname; } catch { host = ''; }
  if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
    console.error(`refusing non-loopback ${label}: ${host || '(unparsable)'}`);
    process.exit(1);
  }
}
assertLoopback(c.API_URL, 'Supabase API_URL');
assertLoopback(c.MAILPIT_URL, 'Mailpit URL');

const env = { ...process.env, VITE_SUPABASE_URL: c.API_URL, VITE_SUPABASE_PUBLISHABLE_KEY: c.ANON_KEY, DARAJA_MAILPIT_URL: c.MAILPIT_URL };
const r = spawnSync(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...args], { env, stdio: 'inherit' });
process.exit(r.status ?? 1);
