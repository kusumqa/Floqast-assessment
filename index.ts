/**
 * API Gateway (mock)
 * Single entry point the test framework talks to. Owns cross-cutting
 * concerns - CORS, authentication, authorization - and proxies validated
 * requests to the User and Transaction services. Downstream services trust
 * the gateway and do not re-check auth (a documented simplification - see
 * README "Design notes").
 */
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { getConfig } from '../../config/environments';
import { ApiErrors } from '../shared/errors';
import { makeLogger } from '../shared/logger';
import { requestLoggingMiddleware } from '../shared/requestLogging';

const app = express();
const config = getConfig();
const log = makeLogger('api-gateway');

const USER_SERVICE_URL = `http://localhost:${config.userServicePort}`;
const TRANSACTION_SERVICE_URL = `http://localhost:${config.transactionServicePort}`;

app.use(cors());
app.use(express.json());
app.use(requestLoggingMiddleware('api-gateway'));

interface AuthContext {
  isAdmin: boolean;
  userId?: string;
}
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

async function resolveToken(token: string): Promise<AuthContext | null> {
  if (token === config.authToken) {
    return { isAdmin: true };
  }
  try {
    const resp = await fetch(`${USER_SERVICE_URL}/internal/tokens/${encodeURIComponent(token)}`);
    if (!resp.ok) return null;
    const body = (await resp.json()) as { userId: string };
    return { isAdmin: false, userId: body.userId };
  } catch (err) {
    log.error('token resolution failed', err);
    return null;
  }
}

/** Requires a valid Authorization: Bearer <token> header. Attaches req.auth. */
async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.header('authorization') || req.header('Authorization');
  if (!header || !header.startsWith('Bearer ')) {
    ApiErrors.unauthorized(res, 'Missing Authorization header. Expected "Bearer <token>".');
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    ApiErrors.unauthorized(res, 'Authorization header present but token is empty');
    return;
  }
  const auth = await resolveToken(token);
  if (!auth) {
    ApiErrors.unauthorized(res, 'Invalid or expired token');
    return;
  }
  req.auth = auth;
  next();
}

/** Requires the caller to be an admin OR to own the resource identified by req.params[paramName]. */
function authorizeOwnerOrAdmin(paramName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const auth = req.auth;
    if (!auth) {
      ApiErrors.unauthorized(res);
      return;
    }
    if (auth.isAdmin) return next();
    if (auth.userId === req.params[paramName]) return next();
    ApiErrors.forbidden(res, `Token does not grant access to resource "${req.params[paramName]}"`);
  };
}

async function proxyJson(
  res: Response,
  targetUrl: string,
  init: { method: string; body?: unknown },
): Promise<void> {
  try {
    const upstream = await fetch(targetUrl, {
      method: init.method,
      headers: { 'Content-Type': 'application/json' },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    const text = await upstream.text();
    const contentType = upstream.headers.get('content-type') || '';
    res.status(upstream.status);
    if (contentType.includes('application/json') && text) {
      res.json(JSON.parse(text));
    } else {
      res.send(text);
    }
  } catch (err) {
    log.error(`proxy to ${targetUrl} failed`, err);
    ApiErrors.internal(res, 'Upstream service unavailable');
  }
}

// ---- Users ----

// Public: registration does not require a token (you don't have one yet).
app.post('/api/users', (req, res) => proxyJson(res, `${USER_SERVICE_URL}/users`, { method: 'POST', body: req.body }));

app.get(
  '/api/users/:id',
  authenticate,
  authorizeOwnerOrAdmin('id'),
  (req, res) => proxyJson(res, `${USER_SERVICE_URL}/users/${encodeURIComponent(req.params.id)}`, { method: 'GET' }),
);

// ---- Transactions ----

app.post('/api/transactions', authenticate, (req, res) => {
  const auth = req.auth as AuthContext;
  const bodyUserId = req.body?.userId;
  if (!auth.isAdmin && bodyUserId !== auth.userId) {
    return ApiErrors.forbidden(res, 'Token does not grant permission to create transactions for this userId');
  }
  return proxyJson(res, `${TRANSACTION_SERVICE_URL}/transactions`, { method: 'POST', body: req.body });
});

app.get(
  '/api/transactions/:userId',
  authenticate,
  authorizeOwnerOrAdmin('userId'),
  (req, res) =>
    proxyJson(res, `${TRANSACTION_SERVICE_URL}/transactions/${encodeURIComponent(req.params.userId)}`, {
      method: 'GET',
    }),
);

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok', service: 'api-gateway' }));

// 404 fallback for unmatched routes
app.use((req, res) => ApiErrors.notFound(res, `No route matches ${req.method} ${req.originalUrl}`));

app.listen(config.gatewayPort, () => {
  console.log(`[api-gateway] listening on port ${config.gatewayPort} (env=${config.name})`);
});

export default app;
