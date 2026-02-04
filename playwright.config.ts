import { defineConfig, devices } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const defaultPort = process.env.PLAYWRIGHT_PORT || '3005'
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${defaultPort}`
process.env.PLAYWRIGHT_BASE_URL = baseURL
const baseURLPort = new URL(baseURL).port || (baseURL.startsWith('https') ? '443' : '80')
const socketPort = process.env.PLAYWRIGHT_SOCKET_PORT || String(Number(baseURLPort) + 1)
const envPath = path.join(__dirname, '.env.test')

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  content.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const [key, ...rest] = trimmed.split('=')
    if (!key) return
    const value = rest.join('=').trim().replace(/^"|"$/g, '')
    if (!process.env[key]) {
      process.env[key] = value
    }
  })
}

const testDatabaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || ''

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120 * 1000,
  expect: {
    timeout: 15 * 1000,
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  globalSetup: './scripts/test-db-setup.js',
  globalTeardown: './scripts/test-db-reset.js',
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      DATABASE_URL: testDatabaseUrl,
      PORT: baseURLPort,
      SOCKET_PORT: socketPort,
    },
  },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
