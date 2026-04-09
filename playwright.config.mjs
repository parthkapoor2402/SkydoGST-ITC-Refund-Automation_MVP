import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  testDir: path.join(rootDir, 'e2e', 'tests'),
  timeout: 120_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    cwd: rootDir,
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      ENABLE_TEST_ROUTES: '1',
      E2E_MOCK_GROK: '1',
    },
  },
})
