import { Locator, Page } from '@playwright/test';
import { TransactionType } from '../../factories/transactionFactory';

const SESSION_KEY = 'fintech_mock_session';

export interface FrontendSession {
  userId: string;
  name: string;
  email: string;
  accountType: string;
  apiToken: string;
}

/** Page Object for mock-frontend/transactions.html */
export class TransactionsPage {
  readonly page: Page;
  readonly amountInput: Locator;
  readonly typeSelect: Locator;
  readonly recipientInput: Locator;
  readonly submitButton: Locator;
  readonly amountError: Locator;
  readonly recipientError: Locator;
  readonly banner: Locator;
  readonly transactionRows: Locator;
  readonly emptyState: Locator;
  readonly loginUserIdInput: Locator;
  readonly loginTokenInput: Locator;
  readonly loginSubmit: Locator;
  readonly loginBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.amountInput = page.getByTestId('amount-input');
    this.typeSelect = page.getByTestId('type-select');
    this.recipientInput = page.getByTestId('recipient-input');
    this.submitButton = page.getByTestId('transaction-submit');
    this.amountError = page.getByTestId('amount-error');
    this.recipientError = page.getByTestId('recipient-error');
    this.banner = page.getByTestId('form-banner');
    this.transactionRows = page.getByTestId('transaction-row');
    this.emptyState = page.getByTestId('transactions-empty');
    this.loginUserIdInput = page.getByTestId('login-userid-input');
    this.loginTokenInput = page.getByTestId('login-token-input');
    this.loginSubmit = page.getByTestId('login-submit');
    this.loginBanner = page.getByTestId('login-banner');
  }

  async goto(baseUrl: string): Promise<void> {
    await this.page.goto(`${baseUrl}/transactions.html`);
  }

  /**
   * Seeds localStorage with an already-authenticated session (obtained via
   * the API or a prior registration) before navigating, so tests can reach
   * the transaction flow directly without re-driving the registration UI
   * every time.
   */
  static async withSession(page: Page, baseUrl: string, session: FrontendSession): Promise<TransactionsPage> {
    await page.addInitScript(
      ({ key, value }: { key: string; value: FrontendSession }) => {
        window.localStorage.setItem(key, JSON.stringify(value));
      },
      { key: SESSION_KEY, value: session },
    );
    await page.goto(`${baseUrl}/transactions.html`);
    return new TransactionsPage(page);
  }

  async loginManually(userId: string, apiToken: string): Promise<void> {
    await this.loginUserIdInput.fill(userId);
    await this.loginTokenInput.fill(apiToken);
    await this.loginSubmit.click();
  }

  async submitTransaction(amount: number | string, type: TransactionType, recipientId?: string): Promise<void> {
    await this.amountInput.fill(String(amount));
    await this.typeSelect.selectOption(type);
    if (type === 'transfer' && recipientId) {
      await this.recipientInput.fill(recipientId);
    }
    await this.submitButton.click();
  }
}
