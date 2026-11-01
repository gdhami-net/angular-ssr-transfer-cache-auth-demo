import { defineConfig } from '@playwright/test';

// One API that counts hits, and one server-rendered build per transfer cache
// setting. The specs run in the installed Microsoft Edge; Playwright gives it
// a temporary profile and deletes it when the run ends.
export const builds = {
  off: 4451,
  on: 4452,
  filter: 4453,
  'filter-only': 4454,
} as const;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { channel: 'msedge' },
  webServer: [
    {
      command: 'node api/server.mjs',
      url: 'http://localhost:4355/hits',
      reuseExistingServer: false,
    },
    ...Object.entries(builds).map(([name, port]) => ({
      command: `node dist/${name}/server/server.mjs`,
      env: { PORT: String(port) },
      url: `http://localhost:${port}/`,
      reuseExistingServer: false,
    })),
  ],
});
