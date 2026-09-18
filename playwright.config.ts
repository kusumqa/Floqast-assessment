import { defineConfig, devices } from '@playwright/test';
import { getConfig } from './config/environments';

const env = getConfig();

export default defineConfig({
  testDir: './tests',
  globalSetup: require.resolve('./tests/global-setup.ts'),
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  outputDir: 'reports/test-results',

  // --- Reporting: multiple formats, satisfying the "bonus" multi-format requirement ---
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['json', { outputFile: 'reports/json/results.json' }],
    ['junit', { outputFile: 'reports/junit/results.xml' }],
  ],

  use: {
    baseURL: env.gatewayBaseUrl,
    extraHTTPHeaders: {},
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: env.uiTimeoutMs,
  },

  projects: [
    {
      name: 'api',
      testDir: './tests/api',
      use: {
        baseURL: env.gatewayBaseUrl,
      },
    },
    {
      name: 'ui-chromium',
      testDir: './tests/ui',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: env.frontendBaseUrl,
        // This sandbox ships a pre-installed Chromium outside Playwright's own
        // managed browser cache; point at it directly rather than downloading
        // a matching revision. Safe to remove in an environment where
        // `npx playwright install chromium` can reach the network normally.
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
          : {},
      },
    },
  ],

  // Boots the full mock backend + static frontend before the suite runs,
  // and tears it down after. reuseExistingServer lets you `npm run mocks:start`
  // once locally and iterate on tests quickly without restarting services.
  webServer: [
    {
      command: 'npx ts-node mock-services/user-service/index.ts',
      port: env.userServicePort,
      reuseExistingServer: !process.env.CI,
      timeout: 20_000,
      env: { TEST_ENV: env.name },
    },
    {
      command: 'npx ts-node mock-services/notification-service/index.ts',
      port: env.notificationServicePort,
      reuseExistingServer: !process.env.CI,
      timeout: 20_000,
      env: { TEST_ENV: env.name },
    },
    {
      command: 'npx ts-node mock-services/transaction-service/index.ts',
      port: env.transactionServicePort,
      reuseExistingServer: !process.env.CI,
      timeout: 20_000,
      env: { TEST_ENV: env.name },
    },
    {
      command: 'npx ts-node mock-services/gateway/index.ts',
      port: env.gatewayPort,
      reuseExistingServer: !process.env.CI,
      timeout: 20_000,
      env: { TEST_ENV: env.name },
    },
    {
      command: 'npx ts-node mock-services/frontend-server/index.ts',
      port: env.frontendPort,
      reuseExistingServer: !process.env.CI,
      timeout: 20_000,
      env: { TEST_ENV: env.name },
    },
  ],
});
