/**
 * API Test Suite - User Service (via API Gateway)
 * Covers: CRUD, data validation, and error scenarios for
 * POST /api/users and GET /api/users/:id.
 * Authentication/authorization for these endpoints lives in auth.spec.ts.
 */
import { test } from '../../utils/helpers/fixtures';
import { expect } from '../../utils/assertions/customAssertions';
import { buildUserPayload, invalidUserPayloads, uniqueEmail } from '../../utils/factories/userFactory';

test.describe('User API - CRUD', () => {
  test('creates a user and returns the expected shape @smoke @crud', async ({ apiClient }) => {
    const payload = buildUserPayload({ accountType: 'premium' });

    const response = await apiClient.createUser(payload);

    expect(response).toHaveStatus(201);
    expect(response.body).toBeValidUserShape();
    expect(response.body).toMatchObject({ name: payload.name, email: payload.email, accountType: 'premium' });
    // apiToken is only ever returned at creation time - never on reads.
    expect((response.body as Record<string, unknown>).apiToken).toBeTruthy();
  });

  test('defaults accountType to "basic" when omitted @crud', async ({ apiClient }) => {
    const payload = buildUserPayload();
    delete (payload as Partial<typeof payload>).accountType;

    const response = await apiClient.createUser(payload);

    expect(response).toHaveStatus(201);
    expect(response.body).toMatchObject({ accountType: 'basic' });
  });

  test('retrieves a previously created user by id @smoke @crud', async ({ apiClient, adminToken }) => {
    const created = await apiClient.createUser(buildUserPayload());
    const userId = (created.body as { id: string }).id;

    const response = await apiClient.getUser(userId, adminToken);

    expect(response).toHaveStatus(200);
    expect(response.body).toBeValidUserShape();
    expect(response.body).toMatchObject({ id: userId });
    // Reads must never leak the credential issued at registration.
    expect(response.body).not.toHaveProperty('apiToken');
  });

  test('returns 404 for a user id that does not exist @crud @negative', async ({ apiClient, adminToken }) => {
    const response = await apiClient.getUser('11111111-1111-4111-8111-111111111111', adminToken);

    expect(response).toHaveStatus(404);
    expect(response).toHaveApiErrorCode('NOT_FOUND');
  });
});

test.describe('User API - data validation', () => {
  const invalid = invalidUserPayloads();

  test('rejects a missing name @validation', async ({ apiClient }) => {
    const response = await apiClient.createUser(invalid.missingName);
    expect(response).toHaveStatus(422);
    expect(response).toHaveApiErrorCode('VALIDATION_ERROR');
    expect((response.body as { error: { details: Record<string, string> } }).error.details).toHaveProperty('name');
  });

  test('rejects a name shorter than 2 characters @validation', async ({ apiClient }) => {
    const response = await apiClient.createUser(invalid.tooShortName);
    expect(response).toHaveStatus(422);
    expect((response.body as { error: { details: Record<string, string> } }).error.details).toHaveProperty('name');
  });

  test('rejects a malformed email address @validation', async ({ apiClient }) => {
    const response = await apiClient.createUser(invalid.malformedEmail);
    expect(response).toHaveStatus(422);
    expect((response.body as { error: { details: Record<string, string> } }).error.details).toHaveProperty('email');
  });

  test('rejects a missing email address @validation', async ({ apiClient }) => {
    const response = await apiClient.createUser(invalid.missingEmail);
    expect(response).toHaveStatus(422);
    expect((response.body as { error: { details: Record<string, string> } }).error.details).toHaveProperty('email');
  });

  test('rejects an unsupported accountType @validation', async ({ apiClient }) => {
    const response = await apiClient.createUser(invalid.invalidAccountType);
    expect(response).toHaveStatus(422);
    expect((response.body as { error: { details: Record<string, string> } }).error.details).toHaveProperty(
      'accountType',
    );
  });

  test('rejects a completely empty body with all field errors @validation', async ({ apiClient }) => {
    const response = await apiClient.createUser(invalid.emptyBody);
    expect(response).toHaveStatus(422);
    const details = (response.body as { error: { details: Record<string, string> } }).error.details;
    expect(details).toHaveProperty('name');
    expect(details).toHaveProperty('email');
  });

  test('rejects a duplicate email with 409 Conflict @validation @negative', async ({ apiClient }) => {
    const email = uniqueEmail('dup');
    const first = await apiClient.createUser(buildUserPayload({ email }));
    expect(first).toHaveStatus(201);

    const second = await apiClient.createUser(buildUserPayload({ email }));
    expect(second).toHaveStatus(409);
    expect(second).toHaveApiErrorCode('CONFLICT');
  });

  test('trims leading/trailing whitespace from name @validation @edge-case', async ({ apiClient }) => {
    const payload = buildUserPayload({ name: '  Padded Name  ' });
    const response = await apiClient.createUser(payload);
    expect(response).toHaveStatus(201);
    expect(response.body).toMatchObject({ name: 'Padded Name' });
  });

  test('normalizes email to lowercase @validation @edge-case', async ({ apiClient }) => {
    const raw = uniqueEmail('MixedCase');
    const payload = buildUserPayload({ email: raw.toUpperCase() });
    const response = await apiClient.createUser(payload);
    expect(response).toHaveStatus(201);
    expect(response.body).toMatchObject({ email: raw.toLowerCase() });
  });
});
