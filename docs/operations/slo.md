# SLO - API SaaS Core Engine

## Scope

- API routes: `auth/*`, `org/*`, `billing/*`, `health`, `ready`
- Window: rolling 28 days

## SLI Definitions

1. Availability SLI
- Definition: `successful_requests / total_requests`
- Successful request: HTTP status `< 500`

2. Latency SLI (p95)
- Definition: p95 of `http_server_duration_ms` by route

3. Critical Flow SLI
- `org.invite.create` success rate
- `auth.login` success response rate (excluding functional 401)

## SLO Targets

1. API availability
- Target: `99.9%` over 28 days
- Error budget: `0.1%`

2. API latency p95
- Target: `< 400ms` on `auth/*` and `org/*`
- Target: `< 800ms` on `billing/*`

3. Invite flow reliability
- Target: `99.5%` success over 28 days

## Release Policy Linked to SLO

1. Freeze rule
- If availability budget burn rate > `2x` over 1h OR `1.2x` over 6h, freeze non-P0 releases.

2. Unfreeze rule
- Unfreeze only after 24h stable burn rate `< 1x` and incident action items started.

## Required Metrics

- `http_server_requests_total{http_route,http_status_code}`
- `http_server_duration_ms{http_route,http_status_code}`
- `org_invite_rate_limited_total`

## Review Cadence

- Weekly SLO review
- Monthly target recalibration
