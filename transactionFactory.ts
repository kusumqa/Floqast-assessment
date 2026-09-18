/**
 * Test data factory for transaction payloads.
 */
export type TransactionType = 'transfer' | 'deposit' | 'withdrawal';

export interface TransactionPayload {
  userId: string;
  amount: number;
  type: TransactionType;
  recipientId?: string;
}

export function buildDepositPayload(userId: string, overrides: Partial<TransactionPayload> = {}): TransactionPayload {
  return { userId, amount: 100.5, type: 'deposit', ...overrides };
}

export function buildWithdrawalPayload(userId: string, overrides: Partial<TransactionPayload> = {}): TransactionPayload {
  return { userId, amount: 50, type: 'withdrawal', ...overrides };
}

export function buildTransferPayload(
  userId: string,
  recipientId: string,
  overrides: Partial<TransactionPayload> = {},
): TransactionPayload {
  return { userId, amount: 25.75, type: 'transfer', recipientId, ...overrides };
}

/** Named invalid payload variants for validation/error-scenario tests. */
export function invalidTransactionPayloads(userId: string, recipientId: string): Record<string, unknown> {
  return {
    missingUserId: { amount: 100, type: 'deposit' },
    negativeAmount: { userId, amount: -10, type: 'deposit' },
    zeroAmount: { userId, amount: 0, type: 'deposit' },
    tooManyDecimals: { userId, amount: 10.999, type: 'deposit' },
    invalidType: { userId, amount: 10, type: 'bitcoin' },
    transferMissingRecipient: { userId, amount: 10, type: 'transfer' },
    transferToSelf: { userId, amount: 10, type: 'transfer', recipientId: userId },
    unknownUserId: { userId: 'does-not-exist-123', amount: 10, type: 'deposit' },
    unknownRecipientId: { userId, amount: 10, type: 'transfer', recipientId: 'does-not-exist-456' },
    emptyBody: {},
  };
}
