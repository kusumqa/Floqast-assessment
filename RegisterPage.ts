import { Locator, Page } from '@playwright/test';
import { AccountType } from '../../factories/userFactory';

/** Page Object for mock-frontend/register.html */
export class RegisterPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly accountTypeSelect: Locator;
  readonly submitButton: Locator;
  readonly nameError: Locator;
  readonly emailError: Locator;
  readonly banner: Locator;
  readonly continueButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.getByTestId('name-input');
    this.emailInput = page.getByTestId('email-input');
    this.accountTypeSelect = page.getByTestId('account-type-select');
    this.submitButton = page.getByTestId('register-submit');
    this.nameError = page.getByTestId('name-error');
    this.emailError = page.getByTestId('email-error');
    this.banner = page.getByTestId('form-banner');
    this.continueButton = page.getByTestId('continue-to-transactions');
  }

  async goto(baseUrl: string): Promise<void> {
    await this.page.goto(`${baseUrl}/register.html`);
  }

  async fillForm(name: string, email: string, accountType: AccountType = 'basic'): Promise<void> {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.accountTypeSelect.selectOption(accountType);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async register(name: string, email: string, accountType: AccountType = 'basic'): Promise<void> {
    await this.fillForm(name, email, accountType);
    await this.submit();
  }
}
