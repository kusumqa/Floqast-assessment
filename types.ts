export type AccountType = 'basic' | 'premium';
export type TransactionType = 'transfer' | 'deposit' | 'withdrawal';
export type TransactionStatus = 'completed' | 'pending' | 'failed';

export interface User {
  id: string;
  name: string;
  email: string;
  accountType: AccountType;
  createdAt: string;
  /** Issued at registration; simulates a per-account API credential used for auth in downstream calls. */
  apiToken: string;
}

/** Shape returned to clients - never leaks apiToken on reads other than the creation response. */
export type PublicUser = Omit<User, 'apiToken'>;

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  recipientId?: string;
  status: TransactionStatus;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  channel: 'email' | 'sms';
  message: string;
  createdAt: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
