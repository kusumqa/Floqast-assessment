/**
 * UI Test Suite - Transaction flow (mock-frontend/transactions.html)
 * Seeds users directly through the API (fast, reliable arrange-step) and
 * then drives the transaction form through the real browser.
 */
import { test } from '../../utils/helpers/fixtures';
import { expect } from '../../utils/assertions/customAssertions';
import { buildUserPayload } from '../../utils/factories/userFactory';
import { TransactionsPage, FrontendSession } from '../../utils/helpers/pages/TransactionsPage';
import { getConfig } from '../../config/environments';

interface CreatedUser {
  id: string;
  name: string;
  email: string;
  accountType: string;
  apiToken: string;
}

async function registerUser(apiClient: import('../../utils/helpers/apiClient').ApiClient): Promise<CreatedUser> {
  const response = await apiClient.createUser(buildUserPayload());
  return response.body as CreatedUser;
}

function toSession(user: CreatedUser): FrontendSession {
  return { userId: user.id, name: user.name, email: user.email, accountType: user.accountType, apiToken: user.apiToken };
}

test.describe('Transaction flow', () => {
  test('submits a deposit and sees it appear in the transactions table @smoke @ui', async ({ page, apiClient }) => {
    const user = await registerUser(apiClient);
    const txPage = await TransactionsPage.withSession(page, '', toSession(user));

    await expect(txPage.emptyState).toBeVisible();

    await txPage.submitTransaction(125.5, 'deposit');

    await expect(txPage.banner).toBeVisible();
    await expect(txPage.banner).toContainText('submitted successfully');
    await expect(txPage.transactionRows).toHaveCount(1);
    await expect(txPage.transactionRows.first()).toContainText('deposit');
    await expect(txPage.transactionRows.first()).toContainText('$125.50');
    await expect(txPage.transactionRows.first()).toContainText('completed');
  });

  test('submits a withdrawal successfully @ui', async ({ page, apiClient }) => {
    const user = await registerUser(apiClient);
    const txPage = await TransactionsPage.withSession(page, '', toSession(user));

    await txPage.submitTransaction(40, 'withdrawal');

    await expect(txPage.transactionRows).toHaveCount(1);
    await expect(txPage.transactionRows.first()).toContainText('withdrawal');
  });

  test('reveals the recipient field only for transfers, and completes a transfer @smoke @ui', async ({
    page,
    apiClient,
  }) => {
    const sender = await registerUser(apiClient);
    const recipient = await registerUser(apiClient);
    const txPage = await TransactionsPage.withSession(page, '', toSession(sender));

    await expect(txPage.recipientInput).toBeHidden();
    await txPage.typeSelect.selectOption('transfer');
    await expect(txPage.recipientInput).toBeVisible();

    await txPage.submitTransaction(15, 'transfer', recipient.id);

    await expect(txPage.banner).toContainText('submitted successfully');
    await expect(txPage.transactionRows.first()).toContainText('transfer');
  });

  test('blocks submission with a client-side error when amount is 0 or blank @ui @validation', async ({
    page,
    apiClient,
  }) => {
    const user = await registerUser(apiClient);
    const txPage = await TransactionsPage.withSession(page, '', toSession(user));

    await txPage.amountInput.fill('0');
    await txPage.submitButton.click();

    await expect(txPage.amountError).toBeVisible();
    await expect(txPage.amountError).toContainText('greater than 0');
    await expect(txPage.banner).toBeHidden();
  });

  test('blocks a transfer submission with a client-side error when recipient is missing @ui @validation', async ({
    page,
    apiClient,
  }) => {
    const user = await registerUser(apiClient);
    const txPage = await TransactionsPage.withSession(page, '', toSession(user));

    await txPage.amountInput.fill('10');
    await txPage.typeSelect.selectOption('transfer');
    await txPage.submitButton.click();

    await expect(txPage.recipientError).toBeVisible();
    await expect(txPage.recipientError).toContainText('Recipient user ID is required');
  });

  test('surfaces the server-side error when the transfer recipient does not exist @ui @negative', async ({
    page,
    apiClient,
  }) => {
    const user = await registerUser(apiClient);
    const txPage = await TransactionsPage.withSession(page, '', toSession(user));

    await txPage.submitTransaction(10, 'transfer', 'does-not-exist-999');

    await expect(txPage.banner).toBeVisible();
    await expect(txPage.banner).toContainText('does not exist');
    await expect(txPage.transactionRows).toHaveCount(0);
  });

  test('prompts for sign-in when no session exists, and signs in with valid credentials @ui', async ({
    page,
    apiClient,
  }) => {
    const user = await registerUser(apiClient);
    const config = getConfig();

    await page.goto(`${config.frontendBaseUrl}/transactions.html`);
    const txPage = new TransactionsPage(page);

    await expect(page.getByTestId('login-page-title')).toHaveText('Sign in');
    await txPage.loginManually(user.id, user.apiToken);

    await expect(page.getByTestId('session-user')).toContainText(user.name);
    await expect(txPage.emptyState).toBeVisible();
  });

  test('shows an error banner for an invalid sign-in token @ui @negative', async ({ page, apiClient }) => {
    const user = await registerUser(apiClient);
    const config = getConfig();

    await page.goto(`${config.frontendBaseUrl}/transactions.html`);
    const txPage = new TransactionsPage(page);

    await txPage.loginManually(user.id, 'a-totally-wrong-token');

    await expect(txPage.loginBanner).toBeVisible();
    await expect(txPage.loginBanner).toContainText('HTTP 401');
  });
});
