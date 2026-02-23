# E2E tests (Playwright)

## Installation

```bash
pnpm -C apps/web exec playwright install
```

## Run

```bash
E2E_BASE_URL="http://127.0.0.1:3000" pnpm -C apps/web test:e2e
```

## Required environment variables by scenario

- `auth.e2e.spec.ts`
  - Signup/verify/login: `E2E_SIGNUP_EMAIL`, `E2E_SIGNUP_PASSWORD`, `E2E_VERIFY_TOKEN`
  - Wrong password: `E2E_LOGIN_EMAIL`, `E2E_LOGIN_BAD_PASSWORD`
  - Reset flow: `E2E_RESET_TOKEN`, `E2E_RESET_NEW_PASSWORD`, `E2E_RESET_EMAIL`
  - Logout invalidates session: `E2E_LOGIN_EMAIL`, `E2E_LOGIN_PASSWORD`
- `multitenant.e2e.spec.ts`
  - `E2E_ORG_A_SESSION_TOKEN`, `E2E_ORG_B_SESSION_TOKEN`
- `billing.e2e.spec.ts`
  - Checkout: `E2E_BILLING_SESSION_TOKEN`
  - Cancel/premium gating (placeholder): `E2E_STRIPE_CLI_ENABLED`

Without these variables, tests are skipped by design.
