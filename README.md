# FinTechCo Test Automation Framework

A Playwright + TypeScript automation framework for a fintech microservices platform (User, Transaction, and Notification services behind an API Gateway). Built for the QA/SDET take-home assessment.

Because no live environment or backend was provided, the framework ships with its own lightweight mock implementation of all four services and a minimal mock frontend, so `npm test` runs a real, working end-to-end suite out of the box - no external dependencies, no stubbed responses.

## What's here

| Requirement | Where |
|---|---|
| API test suite (CRUD, validation, errors, auth) | `tests/api/*.spec.ts` |
| UI test suite (registration, transactions, error validation) | `tests/ui/*.spec.ts` |
| Test data factories | `utils/factories/` |
| Helpers (API client, logging, Page Objects) | `utils/helpers/` |
| Custom assertions | `utils/assertions/customAssertions.ts` |
| Multi-environment config | `config/environments.ts`, `.env.example` |
| Reporting (HTML/JSON/JUnit, screenshots, API logs) | `playwright.config.ts`, `reports/` (generated) |
| Mock backend + frontend (so the suite actually runs) | `mock-services/`, `mock-frontend/` |

## Architecture

```
                        ┌────────────────────┐
   Playwright tests ───▶│    API Gateway      │  (auth, authz, routing, CORS)
  (tests/api/*.spec.ts) │   localhost:4000     │
                        └─────────┬────────────┘
                                  │ internal HTTP
                 ┌────────────────┼─────────────────┐
                 ▼                ▼                 │
        ┌────────────────┐ ┌─────────────────┐      │
        │  User Service   │ │Transaction Svc  │      │
        │  :4001          │ │  :4002           │◀────┘ (existence checks)
        │  (in-memory)    │ │  (in-memory)     │
        └────────┬────────┘ └────────┬─────────┘
                  │ token lookups     │ fire-and-forget
                  │                   ▼
                  │          ┌─────────────────┐
                  │          │ Notification Svc │
                  │          │  :4003 (in-memory)│
                  │          └─────────────────┘
                  │
   Playwright tests ───▶ ┌─────────────────────┐
  (tests/ui/*.spec.ts)   │  Mock frontend        │  register.html / transactions.html
                         │  (static + /config.js)│  :4100
                         └───────────┬───────────┘
                                     └──── calls the Gateway, same as tests/api do
```

Each mock service is a small Express app with an **in-memory** store, standing in for MongoDB/Redis - fine for a self-contained test run, not for production. The **API Gateway** is the single point of entry for both the test suite's API calls and the mock frontend's `fetch()` calls; it owns authentication, ownership-based authorization, CORS, and proxying.

### Design notes / intentional simplifications

- **Auth lives only at the Gateway.** Downstream services trust the Gateway rather than re-validating tokens themselves. In production you'd add service-to-service auth (mTLS, signed JWTs) - out of scope for a 2-hour mock.
- **Auth model:** registration (`POST /api/users`) is public. Every other endpoint requires `Authorization: Bearer <token>`. Each user gets a per-account `apiToken` back *only* at registration (never on reads). A fixed admin token (`config.authToken`, see `.env.example`) can access any resource - useful for setup/verification tests. A user's own token can only access their own resources (403 otherwise) - this is what the authorization test suite exercises, distinct from authentication (401).
- **"dev / staging / prod"** all point at localhost by default, on different port ranges (4000s / 5000s / 6000s), so you can see the config selection actually change behavior without needing real infrastructure. Point any of them at a real deployed Gateway by setting the corresponding `*_GATEWAY_URL` env var (see `.env.example`) - the test suite itself doesn't change.
- **In-memory data** means each service run starts empty and is scoped to that process's lifetime. Test data factories generate unique data per test (uuid-suffixed names/emails) specifically so tests are independent and safe to run in parallel or repeatedly against the same running instance.

## Getting started

```bash
npm install
npx playwright install chromium   # downloads a matching browser build, one-time

npm test                          # runs the full suite (API + UI) against "dev"
```

`npm test` (i.e. `playwright test`) uses Playwright's `webServer` config to boot all five mock processes (user, transaction, notification, gateway, frontend) automatically before the run and tear them down after - you don't need to start anything by hand. If you want to poke at the mock app yourself first, `npm run mocks:start` boots everything and leaves it running.

### Running a subset

```bash
npm run test:api           # API suite only
npm run test:ui            # UI suite only (Chromium)
npx playwright test tests/api/users.spec.ts
npx playwright test -g "@smoke"     # tag-based filtering (@smoke, @crud, @validation, @negative, @authz, @auth, @edge-case)
npm run test:headed        # watch the UI tests run in a real browser window
```

### Running against a different environment

```bash
npm run test:dev        # TEST_ENV=dev     (default - localhost:4000 range)
npm run test:staging    # TEST_ENV=staging (localhost:5000 range, or set STAGING_GATEWAY_URL)
npm run test:prod       # TEST_ENV=prod    (localhost:6000 range, or set PROD_GATEWAY_URL)
```

Copy `.env.example` to `.env` to override any URL - e.g. point `staging` at a real deployed Gateway instead of the local mock:

```bash
cp .env.example .env
# then edit STAGING_GATEWAY_URL=https://staging-api.fintechco.example.com
npm run test:staging
```

### Sandbox note

This assessment was built and verified inside a sandboxed container without normal internet access to Playwright's browser CDN, so `playwright.config.ts` optionally reads `PLAYWRIGHT_CHROMIUM_PATH` to point at a pre-installed Chromium instead of downloading one:

```bash
PLAYWRIGHT_CHROMIUM_PATH=/path/to/chromium npx playwright test
```

On a normal machine this is unnecessary - just run `npx playwright install chromium` once and `npm test` as shown above.

## Reporting

Every run produces, under `reports/` (git-ignored, regenerated each run):

- **`reports/html/`** - Playwright's interactive HTML report (`npm run test:report` to open it). Includes steps, timings, and (on failure) screenshots, video, and a full trace viewer.
- **`reports/json/results.json`** - machine-readable results, e.g. for CI dashboards.
- **`reports/junit/results.xml`** - JUnit XML, for CI systems (Jenkins, GitLab, etc.) that consume it natively.
- **`reports/api-logs/api-traffic.log`** - one JSON line per API call made through `ApiClient` (method, URL, request body, status, response body, duration) - a full audit trail of everything the suite sent and received, independent of the Playwright reporters. `TEST_ENV`'s `logApiTraffic` flag also echoes a one-line summary to the console as tests run.
- **Screenshots/video/trace on UI failure** - `playwright.config.ts` sets `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`, `trace: 'retain-on-failure'`, landing in `reports/test-results/<test-name>/`.

A `.github/workflows/tests.yml` is included as a reference CI pipeline (matrix over the `api`/`ui-chromium` projects, uploads all report artifacts) - not required to run this locally, but shows how this would plug into CI.

## Test suite tour

**`tests/api/users.spec.ts`** - CRUD for `POST /api/users` / `GET /api/users/:id`; validation (missing/short name, malformed/missing email, bad `accountType`, duplicate email → 409); data-normalization edge cases (trimming, lowercasing).

**`tests/api/transactions.spec.ts`** - CRUD for `POST /api/transactions` / `GET /api/transactions/:userId` across deposit/withdrawal/transfer; validation (amount ≤ 0, >2 decimal places, bad `type`, transfer missing/self-referencing `recipientId`, unknown recipient); confirms a failed validation never creates a partial record.

**`tests/api/auth.spec.ts`** - authentication (401: no token, garbage token, malformed header) separated from authorization (403: valid token but wrong owner) across both resources, plus the admin token's cross-user access.

**`tests/ui/registration.spec.ts`** - happy-path registration → session established → navigation to transactions; client-side validation (empty form, bad email format); server-side error surfaced in the UI (duplicate email, with the real HTTP status shown); account-type selection.

**`tests/ui/transactions.spec.ts`** - deposit/withdrawal/transfer submission and table rendering; the recipient field's conditional visibility; client-side validation (zero/blank amount, missing recipient); a server-rejected transfer (unknown recipient) surfaced as a UI error; the manual sign-in flow (valid and invalid credentials).

All UI tests drive the **real** mock frontend against the **real** mock Gateway - no `page.route()` interception - so they also catch frontend/backend contract drift, not just DOM behavior.

## Test data & utilities

- **`utils/factories/userFactory.ts` / `transactionFactory.ts`** - build valid payloads with unique data per call (safe for parallel/repeated runs), plus named invalid-payload variants (`invalidUserPayloads()`, `invalidTransactionPayloads()`) so validation tests read as intent, not as inline JSON blobs.
- **`utils/helpers/apiClient.ts`** - typed wrapper around Playwright's `APIRequestContext`: attaches bearer tokens, times every call, and logs it (see Reporting above).
- **`utils/helpers/pages/`** - Page Object Models (`RegisterPage`, `TransactionsPage`) built on `data-testid` locators, including a `TransactionsPage.withSession()` helper that seeds an authenticated session via `localStorage` so UI tests can start directly on the transactions page without re-driving the registration form every time.
- **`utils/assertions/customAssertions.ts`** - domain-specific matchers (`toHaveStatus`, `toHaveApiErrorCode`, `toBeValidUserShape`, `toBeValidTransactionShape`) that produce readable failure diffs instead of generic `toBe` assertions.
- **`utils/helpers/fixtures.ts`** - extends Playwright's `test` with a ready-to-use `apiClient` (bound to the current `TEST_ENV`) and `adminToken` fixture.

## Project structure

```
config/environments.ts        environment selection (dev/staging/prod)
mock-services/                 mock User/Transaction/Notification services + Gateway + static frontend server
mock-frontend/                 registration.html / transactions.html / index.html + app.js + styles.css
utils/factories/               test data factories
utils/helpers/                 API client, logger, fixtures, Page Objects
utils/assertions/              custom Playwright matchers
tests/api/                     API test suite
tests/ui/                      UI test suite
tests/global-setup.ts          one-time run setup (resets the API traffic log)
playwright.config.ts           projects, reporters, webServer orchestration
.github/workflows/tests.yml    reference CI pipeline
reports/                       generated output (git-ignored)
```

## What I'd add with more time

- Contract tests (e.g. Pact) between the Gateway and each service instead of relying on integration tests alone to catch drift.
- Load/performance testing (k6 or Artillery) against the Transaction service - the assessment scope for this deliverable was the automation framework itself.
- Dockerizing the mock services so `docker compose up` replaces the `webServer` block, closer to how the real services would run.
- Visual regression coverage for the mock frontend.
- Pagination and filtering tests once `GET /api/transactions/:userId` supports query params (currently returns the full list, matching the provided spec).
- A cross-browser UI project (Firefox/WebKit) - currently Chromium-only to keep the sandbox verification fast; adding `devices['Desktop Firefox']` etc. as additional `projects` entries is a one-line change.
