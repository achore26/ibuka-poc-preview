import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', timeout: 60000, workers: 1, reporter: 'list',
  use: { baseURL: 'http://localhost:5173', channel: 'chrome', trace: 'off', screenshot: 'off' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort', url: 'http://localhost:5173', reuseExistingServer: false },
});
