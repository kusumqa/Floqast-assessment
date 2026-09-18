/**
 * API Test Suite - Authentication & Authorization
 * The Gateway is the sole enforcement point (see mock-services/gateway).
 * Authentication = "is this a valid token at all?" (401 on failure)
 * Authorization  = "does this valid token's owner have rights to this resource?" (403 on failure)
 * POST /api/users (registration) is the one intentionally public route - you
 * don't have a token until after you register.
 */
import { test } from '../../utils/helpers/fixtures';
import { expect } from '../../utils/assertions/customAssertions';
import { buildUserPayload } from '../../utils/factories/userFactory';
import { buildDepositPayload } from '../../utils/factories/transactionFactory';

interface CreatedUser {
  id: string;
  apiToken: string;
}

async function registerUser(apiClient: import('../../utils/helpers/apiClient').ApiClient): Promise<CreatedUser> {
  const response = await apiClient.createUser(buildUserPayload());
  return response.body as CreatedUser;
}

test.describe('Authentication', () => {
  test('POST /api/users requires no token (public registration) @smoke @auth', async ({ apiClient }) => {
    const response = await apiClient.createUser(buildUserPayload());
    expect(response).toHaveStatus(201);
  });

  test('GET /api/users/:id without a token returns 401 @auth @negative', async ({ apiClient }) => {
    const user = await registerUser(apiClient);
    const response = await apiClient.getUser(user.id); // no token passed
    expect(response).toHaveStatus(401);
    expect(response).toHaveApiErrorCode('UNAUTHORIZED');
  });

  test('GET /api/users/:id with a garbage token returns 401 @auth @negative', async ({ apiClient }) => {
    const user = await registerUser(apiClient);
    const response = await apiClient.getUser(user.id, 'this-token-does-not-exist');
    expect(response).toHaveStatus(401);
  });

  test('GET /api/users/:id with a malformed Authorization header (no "Bearer " prefix) returns 401 @auth @negative', async ({
    apiClient,
  }) => {
    const user = await registerUser(apiClient);
    const response = await apiClient.call('GET', `/api/users/${user.id}`, {
      headers: { Authorization: user.apiToken }, // missing "Bearer " prefix
    });
    expect(response).toHaveStatus(401);
  });

  test('POST /api/transactions without a token returns 401 @auth @negative', async ({ apiClient }) => {
    const user = await registerUser(apiClient);
    const response = await apiClient.createTransaction(buildDepositPayload(user.id));
    expect(response).toHaveStatus(401);
  });

  test('GET /api/transactions/:userId without a token returns 401 @auth @negative', async ({ apiClient }) => {
    const user = await registerUser(apiClient);
    const response = await apiClient.getTransactions(user.id);
    expect(response).toHaveStatus(401);
  });

  test('the admin/system token authenticates successfully @auth', async ({ apiClient, adminToken }) => {
    const user = await registerUser(apiClient);
    const response = await apiClient.getUser(user.id, adminToken);
    expect(response).toHaveStatus(200);
  });
});

test.describe('Authorization', () => {
  test('a user token can read its own profile @authz', async ({ apiClient }) => {
    const user = await registerUser(apiClient);
    const response = await apiClient.getUser(user.id, user.apiToken);
    expect(response).toHaveStatus(200);
  });

  test('a user token cannot read another user\'s profile (403) @authz @negative', async ({ apiClient }) => {
    const userA = await registerUser(apiClient);
    const userB = await registerUser(apiClient);

    const response = await apiClient.getUser(userB.id, userA.apiToken);

    expect(response).toHaveStatus(403);
    expect(response).toHaveApiErrorCode('FORBIDDEN');
  });

  test('a user token cannot list another user\'s transactions (403) @authz @negative', async ({ apiClient }) => {
    const userA = await registerUser(apiClient);
    const userB = await registerUser(apiClient);
    await apiClient.createTransaction(buildDepositPayload(userB.id), userB.apiToken);

    const response = await apiClient.getTransactions(userB.id, userA.apiToken);

    expect(response).toHaveStatus(403);
  });

  test('the admin token can read any user\'s profile and transactions @authz', async ({ apiClient, adminToken }) => {
    const user = await registerUser(apiClient);
    await apiClient.createTransaction(buildDepositPayload(user.id), user.apiToken);

    const profileResponse = await apiClient.getUser(user.id, adminToken);
    const txResponse = await apiClient.getTransactions(user.id, adminToken);

    expect(profileResponse).toHaveStatus(200);
    expect(txResponse).toHaveStatus(200);
  });
});
