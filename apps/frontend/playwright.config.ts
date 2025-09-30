import { defineConfig, devices } from '@playwright/test';

const port = 3100;

export default defineConfig({
  testDir: './tests',
  timeout: 120000,
  expect: { timeout: 5000 },
  webServer: {
    command: 'pnpm dev -- --hostname 0.0.0.0 --port ' + port,
    port,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXTAUTH_URL: `http://127.0.0.1:${port}`,
      NEXTAUTH_SECRET: 'test',
      GOOGLE_CLIENT_ID: 'test',
      GOOGLE_CLIENT_SECRET: 'test',
      NEXT_PUBLIC_API_BASE_URL: 'http://localhost:4000',
      MOCK_MODE: 'true'
    }
  },
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
