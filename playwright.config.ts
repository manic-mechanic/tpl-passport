import { defineConfig, devices } from '@playwright/test'

const useManagedWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER !== '1'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    permissions: ['geolocation'],
    geolocation: { latitude: 43.6532, longitude: -79.3832 },
  },
  webServer: useManagedWebServer
    ? {
        command: 'npm run dev -- --host 127.0.0.1 --port 4173',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: true,
        timeout: 300000,
      }
    : undefined,
  projects: [
    {
      name: 'chromium-mobile',
      use: {
        browserName: 'chromium',
        ...devices['iPhone 14'],
      },
    },
  ],
})
