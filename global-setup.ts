/**
 * Runs once before any test worker starts (across all projects/processes).
 * Truncates the shared API traffic log exactly once per run so that
 * concurrent worker processes (api + ui-chromium projects each run in
 * their own process) only ever append, never race to reset the file.
 */
import * as fs from 'fs';
import * as path from 'path';

export default function globalSetup(): void {
  const logDir = path.resolve(__dirname, '..', 'reports', 'api-logs');
  fs.mkdirSync(logDir, { recursive: true });
  fs.writeFileSync(path.join(logDir, 'api-traffic.log'), '');
}
