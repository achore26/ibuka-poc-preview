import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
const db = process.env.DARAJA_DB_WORKTREE ?? path.resolve('../ibuka-recovery-db');
const c = JSON.parse(execFileSync('supabase', ['status', '--output', 'json'], { cwd: db, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
const env = { ...process.env, VITE_SUPABASE_URL: c.API_URL, VITE_SUPABASE_PUBLISHABLE_KEY: c.ANON_KEY, DARAJA_MAILPIT_URL: c.MAILPIT_URL };
const r = spawnSync(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)], { env, stdio: 'inherit' });
process.exit(r.status ?? 1);
