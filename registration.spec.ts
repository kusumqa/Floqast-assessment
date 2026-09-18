/**
 * UI Test Suite - Registration flow (mock-frontend/register.html)
 * Drives the real form against the real Gateway/User Service - no route
 * mocking - so these tests catch frontend/backend contract drift too.
 */
import { test } from '../../utils/helpers/fixtures';
import { expect } from '../../utils/assertions/customAssertions';
import { buildUserPayload, uniqueEmail } from '../../utils/factories/userFactory';
import { RegisterPage } from '../../utils/helpers/pages/RegisterPage';

test.describe('Registration flow', () => {
  test('successfully registers a new user and offers to continue @smoke @ui', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    const payload = buildUserPayload({ accountType: 'premium' });

    await registerPage.goto('');
    await registerPage.register(payload.name, payload.email, 'premium');

    await expect(registerPage.banner).toBeVisible();
    await expect(registerPage.banner).toContainText('Account created');
    await expect(registerPage.banner).toContainText(payload.name);
    await expect(registerPage.continueButton).toBeVisible();

    // The session captured client-side should carry through to the next page.
    await registerPage.continueButton.click();
    await expect(page).toHaveURL(/transactions\.html/);
    await expect(page.getByTestId('session-user')).toContainText(payload.name);
  });

  test('shows inline errors and blocks submission for empty required fields @ui @validation', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto('');

    await registerPage.submit(); // submit without filling anything

    await expect(registerPage.nameError).toBeVisible();
    await expect(registerPage.nameError).toContainText('at least 2 characters');
    await expect(registerPage.emailError).toBeVisible();
    await expect(registerPage.emailError).toContainText('valid email');
    // No network call should have been attempted - the banner stays hidden.
    await expect(registerPage.banner).toBeHidden();
  });

  test('shows an inline error for an invalid email format @ui @validation', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto('');

    await registerPage.fillForm('Valid Name', 'not-an-email');
    await registerPage.submit();

    await expect(registerPage.emailError).toBeVisible();
    await expect(registerPage.emailError).toContainText('valid email');
  });

  test('surfaces the server-side error when the email is already registered @ui @negative', async ({
    page,
    apiClient,
  }) => {
    // Pre-create a user via the API so the UI attempt is guaranteed to collide.
    const existing = buildUserPayload();
    const created = await apiClient.createUser(existing);
    expect(created).toHaveStatus(201);

    const registerPage = new RegisterPage(page);
    await registerPage.goto('');
    await registerPage.register('Someone Else', existing.email);

    await expect(registerPage.banner).toBeVisible();
    await expect(registerPage.banner).toContainText('already exists');
    await expect(registerPage.banner).toContainText('HTTP 409');
    // Form must remain visible so the user can correct and retry.
    await expect(registerPage.submitButton).toBeVisible();
  });

  test('defaults to a Basic account and allows switching to Premium @ui', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto('');

    await expect(registerPage.accountTypeSelect).toHaveValue('basic');
    await registerPage.accountTypeSelect.selectOption('premium');
    await expect(registerPage.accountTypeSelect).toHaveValue('premium');

    const email = uniqueEmail('premium-ui');
    await registerPage.fillForm('Premium Picker', email, 'premium');
    await registerPage.submit();

    await expect(registerPage.banner).toContainText('Account created');
  });
});
