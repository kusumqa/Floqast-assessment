/**
 * Thin, typed wrapper around Playwright's APIRequestContext. Centralizes
 * how the test suite talks to the Gateway: auth header handling, response
 * parsing, timing, and traffic logging, so individual specs stay focused
 * on assertions rather than plumbing.
 */
import { APIRequestContext, APIResponse } from '@playwright/test';
import { getConfig } from '../../config/environments';
import { logApiCall } from './apiLogger';

export interface ApiCallResult<T = unknown> {
  status: number;
  ok: boolean;
  body: T;
  raw: APIResponse;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export class ApiClient {
  constructor(private readonly request: APIRequestContext) {}

  async call<T = unknown>(
    method: HttpMethod,
    path: string,
    opts: { body?: unknown; token?: string; headers?: Record<string, string> } = {},
  ): Promise<ApiCallResult<T>> {
    const config = getConfig();
    const headers: Record<string, string> = { ...(opts.headers ?? {}) };
    if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

    const start = Date.now();
    const raw = await this.request.fetch(path, {
      method,
      headers,
      data: opts.body,
      timeout: config.apiTimeoutMs,
      failOnStatusCode: false,
    });
    const durationMs = Date.now() - start;

    let body: T;
    try {
      body = (await raw.json()) as T;
    } catch {
      body = undefined as unknown as T;
    }

    logApiCall({
      timestamp: new Date().toISOString(),
      method,
      url: path,
      requestBody: opts.body,
      status: raw.status(),
      responseBody: body,
      durationMs,
    });

    return { status: raw.status(), ok: raw.ok(), body, raw };
  }

  // ---- Users ----
  createUser<T = unknown>(payload: unknown) {
    return this.call<T>('POST', '/api/users', { body: payload });
  }
  getUser<T = unknown>(id: string, token?: string) {
    return this.call<T>('GET', `/api/users/${encodeURIComponent(id)}`, { token });
  }

  // ---- Transactions ----
  createTransaction<T = unknown>(payload: unknown, token?: string) {
    return this.call<T>('POST', '/api/transactions', { body: payload, token });
  }
  getTransactions<T = unknown>(userId: string, token?: string) {
    return this.call<T>('GET', `/api/transactions/${encodeURIComponent(userId)}`, { token });
  }

  // ---- Generic escape hatch for negative-path / malformed-route tests ----
  raw<T = unknown>(method: HttpMethod, path: string, opts: { body?: unknown; token?: string } = {}) {
    return this.call<T>(method, path, opts);
  }
}
