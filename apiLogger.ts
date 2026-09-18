/**
 * Persists every API call made through ApiClient to reports/api-logs/api-traffic.log
 * (one JSON object per line) and optionally echoes a one-line summary to stdout.
 * Satisfies the "API response logging" reporting requirement independently of
 * whichever Playwright reporters are enabled.
 */
import * as fs from 'fs';
import * as path from 'path';
import { getConfig } from '../../config/environments';

const LOG_DIR = path.resolve(__dirname, '..', '..', 'reports', 'api-logs');
const LOG_FILE = path.join(LOG_DIR, 'api-traffic.log');

export interface ApiLogEntry {
  timestamp: string;
  method: string;
  url: string;
  requestBody?: unknown;
  status: number;
  responseBody?: unknown;
  durationMs: number;
}

/**
 * The log file itself is truncated exactly once per run by global-setup.ts
 * (which runs before any worker process starts) - not here - because this
 * module is loaded independently in every worker process (each Playwright
 * project runs in its own process), and a per-process reset would race
 * with, and clobber, other workers' entries.
 */
export function logApiCall(entry: ApiLogEntry): void {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.appendFileSync(LOG_FILE, `${JSON.stringify(entry)}\n`);
  if (getConfig().logApiTraffic) {
    console.log(`[api] ${entry.method} ${entry.url} -> ${entry.status} (${entry.durationMs}ms)`);
  }
}

export function apiLogFilePath(): string {
  return LOG_FILE;
}
