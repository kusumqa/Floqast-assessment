/**
 * Custom Playwright matchers for this domain. Import `expect` from this
 * module (instead of directly from @playwright/test) in any spec that
 * wants the domain-specific assertions below - it re-exports the base
 * `expect` fully extended, so it's a drop-in replacement.
 */
import { expect as baseExpect } from '@playwright/test';

interface StatusBearing {
  status: number;
  body?: unknown;
}
interface ApiErrorBearing {
  body: { error?: { code?: string; message?: string } };
}

function hasRequiredFields(obj: unknown, fields: string[]): string[] {
  if (!obj || typeof obj !== 'object') return fields;
  return fields.filter((f) => !(f in (obj as Record<string, unknown>)));
}

export const expect = baseExpect.extend({
  toHaveStatus(received: StatusBearing, expectedStatus: number) {
    const pass = received.status === expectedStatus;
    return {
      pass,
      name: 'toHaveStatus',
      message: () =>
        `expected response status ${pass ? 'not ' : ''}to be ${expectedStatus}, got ${received.status}\n` +
        `Body: ${JSON.stringify(received.body, null, 2)}`,
    };
  },

  toHaveApiErrorCode(received: ApiErrorBearing, expectedCode: string) {
    const actualCode = received.body?.error?.code;
    const pass = actualCode === expectedCode;
    return {
      pass,
      name: 'toHaveApiErrorCode',
      message: () =>
        `expected API error code ${pass ? 'not ' : ''}to be "${expectedCode}", got "${actualCode}"\n` +
        `Body: ${JSON.stringify(received.body, null, 2)}`,
    };
  },

  toBeValidUserShape(received: unknown) {
    const required = ['id', 'name', 'email', 'accountType', 'createdAt'];
    const missing = hasRequiredFields(received, required);
    const pass = missing.length === 0;
    return {
      pass,
      name: 'toBeValidUserShape',
      message: () =>
        pass
          ? 'expected object not to be a valid user shape'
          : `user object missing required field(s): ${missing.join(', ')}\nReceived: ${JSON.stringify(received, null, 2)}`,
    };
  },

  toBeValidTransactionShape(received: unknown) {
    const required = ['id', 'userId', 'amount', 'type', 'status', 'createdAt'];
    const missing = hasRequiredFields(received, required);
    const pass = missing.length === 0;
    return {
      pass,
      name: 'toBeValidTransactionShape',
      message: () =>
        pass
          ? 'expected object not to be a valid transaction shape'
          : `transaction object missing required field(s): ${missing.join(', ')}\nReceived: ${JSON.stringify(received, null, 2)}`,
    };
  },
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace PlaywrightTest {
    interface Matchers<R, T> {
      toHaveStatus(expected: number): R;
      toHaveApiErrorCode(expected: string): R;
      toBeValidUserShape(): R;
      toBeValidTransactionShape(): R;
    }
  }
}
