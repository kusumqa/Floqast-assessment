/**
 * Shared Playwright test fixtures. Extends the base `test` with a
 * pre-configured ApiClient (bound to the current environment's gateway
 * URL) and the admin bearer token, so specs never construct request
 * contexts by hand.
 */
import { test as base } from '@playwright/test';
import { ApiClient } from './apiClient';
import { getConfig } from '../../config/environments';

interface Fixtures {
  apiClient: ApiClient;
  adminToken: string;
}

export const test = base.extend<Fixtures>({
  apiClient: async ({ playwright }, use) => {
    const config = getConfig();
    const context = await playwright.request.newContext({ baseURL: config.gatewayBaseUrl });
    const client = new ApiClient(context);
    await use(client);
    await context.dispose();
  },

  adminToken: async ({}, use) => {
    await use(getConfig().authToken);
  },
});
