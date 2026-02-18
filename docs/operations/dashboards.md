# Dashboards - Minimum Operational Set

## Dashboard 1: API Overview

- Request rate by route
- Error rate by route
- p50/p95 latency by route
- Top 5 failing routes

Metrics:
- `http_server_requests_total`
- `http_server_duration_ms`

## Dashboard 2: Auth Health

- `/api/auth/login` request rate and 5xx rate
- `/api/auth/signup` request rate and 5xx rate
- OAuth callback failures over time
- Rate-limit events on auth routes

## Dashboard 3: Org Operations

- `/api/org/invite` success/429/5xx split
- Invite acceptance conversion
- Member role/remove/transfer action success rates
- Audit event throughput

Metrics:
- `org_invite_rate_limited_total`
- `http_server_requests_total{http_route=~"/api/org/.*"}`

## Dashboard 4: Billing Reliability

- Webhook request rate and failure ratio
- Duplicate/ignored webhook counts
- Checkout + portal endpoint health

## Correlation Strategy

- Primary key: `x-request-id`
- Secondary key: `x-trace-id` / `x-span-id`
- Incident investigations must include both log and trace links.
