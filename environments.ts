/**
 * Centralized environment configuration.
 *
 * Selects a config block based on the TEST_ENV environment variable
 * (defaults to "dev"). Each environment defines the base URL for the
 * API Gateway (the single entry point tests talk to) plus per-service
 * ports used only by the mock services themselves when running locally.
 *
 * In a real deployment, `staging` and `prod` would point at actually
 * deployed gateway URLs (e.g. https://staging-api.fintechco.com). Here,
 * since this framework ships with in-memory mock services, all three
 * environments default to localhost on different ports so you can see
 * the framework picking up a different target per environment without
 * needing real infrastructure. Override any of them via .env or
 * exported shell variables - see .env.example.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load a .env file if present (does not throw if missing)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

export type EnvName = 'dev' | 'staging' | 'prod';

export interface EnvironmentConfig {
  name: EnvName;
  gatewayBaseUrl: string;
  gatewayPort: number;
  userServicePort: number;
  transactionServicePort: number;
  notificationServicePort: number;
  frontendBaseUrl: string;
  frontendPort: number;
  apiTimeoutMs: number;
  uiTimeoutMs: number;
  /** Static bearer token the mock services accept - simulates an auth layer. */
  authToken: string;
  /** Toggles verbose API request/response logging in tests. */
  logApiTraffic: boolean;
}

const baseDefaults = {
  apiTimeoutMs: 10_000,
  uiTimeoutMs: 15_000,
  authToken: 'test-bearer-token-12345',
  logApiTraffic: true,
};

const environments: Record<EnvName, EnvironmentConfig> = {
  dev: {
    ...baseDefaults,
    name: 'dev',
    gatewayBaseUrl: process.env.DEV_GATEWAY_URL || 'http://localhost:4000',
    gatewayPort: 4000,
    userServicePort: 4001,
    transactionServicePort: 4002,
    notificationServicePort: 4003,
    frontendBaseUrl: process.env.DEV_FRONTEND_URL || 'http://localhost:4100',
    frontendPort: 4100,
  },
  staging: {
    ...baseDefaults,
    name: 'staging',
    gatewayBaseUrl: process.env.STAGING_GATEWAY_URL || 'http://localhost:5000',
    gatewayPort: 5000,
    userServicePort: 5001,
    transactionServicePort: 5002,
    notificationServicePort: 5003,
    frontendBaseUrl: process.env.STAGING_FRONTEND_URL || 'http://localhost:5100',
    frontendPort: 5100,
    logApiTraffic: true,
  },
  prod: {
    ...baseDefaults,
    name: 'prod',
    gatewayBaseUrl: process.env.PROD_GATEWAY_URL || 'http://localhost:6000',
    gatewayPort: 6000,
    userServicePort: 6001,
    transactionServicePort: 6002,
    notificationServicePort: 6003,
    frontendBaseUrl: process.env.PROD_FRONTEND_URL || 'http://localhost:6100',
    frontendPort: 6100,
    apiTimeoutMs: 15_000,
    logApiTraffic: false,
  },
};

export function getEnvName(): EnvName {
  const raw = (process.env.TEST_ENV || 'dev').toLowerCase();
  if (raw === 'dev' || raw === 'staging' || raw === 'prod') return raw;
  console.warn(`Unknown TEST_ENV "${raw}", falling back to "dev"`);
  return 'dev';
}

export function getConfig(): EnvironmentConfig {
  return environments[getEnvName()];
}

export default environments;
