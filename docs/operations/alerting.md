# Alerting Policy

## Severity Model

1. `P1`
- Customer-visible outage or severe degradation.

2. `P2`
- Significant degradation with workarounds.

3. `P3`
- Non-critical issue, no major customer impact.

## Alerts

1. API availability burn
- Condition: burn rate > `2x` (1h) OR `1.2x` (6h)
- Severity: `P1`

2. API latency degradation
- Condition: p95 `http_server_duration_ms` > target for 15m
- Severity: `P2`

3. Readiness failure
- Condition: `/api/ready` returns non-200 for 5m
- Severity: `P1`

4. Billing webhook failures
- Condition: `billing/webhook` 5xx ratio > 5% for 10m
- Severity: `P1`

5. Invite abuse spike
- Condition: `org_invite_rate_limited_total` > normal baseline + 3 sigma
- Severity: `P2`

6. Impersonation starts spike
- Condition: `action=org.impersonation.started` exceeds baseline + 3 sigma over 30m
- Severity: `P2`

7. Forbidden impersonation attempts
- Condition: `action=org.impersonation.started` with `outcome=forbidden` > 5 in 10m
- Severity: `P2`

8. RBAC policy churn anomaly
- Condition: `action=org.roles.updated` exceeds baseline + 3 sigma over 1h
- Severity: `P3`

## Routing

- `P1`: Pager + incident channel + on-call escalation
- `P2`: Incident channel + ticket
- `P3`: Ticket backlog only

## Runbooks

- DB down: use `/api/ready` diagnostics + DB failover runbook
- Stripe webhook backlog: replay strategy + idempotency verification
- Auth spike: rate-limit tuning + suspicious IP blocking
