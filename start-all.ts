/**
 * Convenience script: boots all four mock services (user, transaction,
 * notification, gateway) plus the static frontend server in a single
 * process, useful for local manual exploration (`npm run mocks:start`).
 * Playwright's own webServer config in playwright.config.ts starts these
 * independently for test runs, so this script is not required for `npm test`.
 */
import './user-service/index';
import './transaction-service/index';
import './notification-service/index';
import './gateway/index';
import './frontend-server/index';

console.log('All mock services starting...');
