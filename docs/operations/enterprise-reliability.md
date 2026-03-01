# Enterprise Reliability (Optional External Scheduler)

This project does not include an internal worker or cron process.

## Recommended default

- Webhook-first billing sync
- Manual admin action: `Reconcile now`
- Auto-reconcile when returning from Stripe Billing Portal

## Optional external cron

If you need periodic reconciliation, configure an external scheduler (outside app runtime).

### Vercel Cron (example)

1. Add a cron entry that calls a protected reconcile endpoint.
2. Trigger only lightweight reconciliations (for orgs marked `needs_reconcile=true`).

### GitHub Actions (example)

1. Add a scheduled workflow (`schedule` trigger).
2. Call the same protected reconcile endpoint with a service token.

Keep this optional to avoid adding operational complexity to the core template.
