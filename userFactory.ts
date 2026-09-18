/**
 * Test data factory for user payloads. Every call generates a unique
 * name/email pair (via uuid) so parallel test workers never collide on
 * the mock User Service's email-uniqueness constraint.
 */
import { v4 as uuidv4 } from 'uuid';

export type AccountType = 'basic' | 'premium';

export interface UserPayload {
  name: string;
  email: string;
  accountType?: AccountType;
}

export function uniqueEmail(prefix = 'qa.user'): string {
  return `${prefix}.${uuidv4().slice(0, 8)}@example.com`;
}

export function buildUserPayload(overrides: Partial<UserPayload> = {}): UserPayload {
  const unique = uuidv4().slice(0, 8);
  return {
    name: `Test User ${unique}`,
    email: uniqueEmail(),
    accountType: 'basic',
    ...overrides,
  };
}

export function buildPremiumUserPayload(overrides: Partial<UserPayload> = {}): UserPayload {
  return buildUserPayload({ accountType: 'premium', ...overrides });
}

/**
 * Named invalid payload variants for data-validation tests. Each entry
 * documents which rule it's meant to violate. `as any` casts are
 * intentional - these payloads exist to send bad data across the wire.
 */
export function invalidUserPayloads(): Record<string, unknown> {
  return {
    missingName: { email: uniqueEmail(), accountType: 'basic' },
    missingEmail: { name: 'No Email User', accountType: 'basic' },
    tooShortName: { name: 'A', email: uniqueEmail(), accountType: 'basic' },
    malformedEmail: { name: 'Bad Email User', email: 'not-an-email', accountType: 'basic' },
    invalidAccountType: { name: 'Odd Type User', email: uniqueEmail(), accountType: 'gold' },
    emptyBody: {},
  };
}
