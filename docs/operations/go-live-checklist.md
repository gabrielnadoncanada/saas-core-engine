# Go-Live Checklist

## Security

- [ ] `SESSION_COOKIE_SECURE=true` in production
- [ ] `SESSION_COOKIE_SAME_SITE` explicitly set (`lax` or `strict`)
- [ ] `RESEND_API_KEY` configured in production
- [ ] Auth rate limiting enabled
- [ ] If `BILLING_ENABLED=true`, Stripe webhook secret configured and validated

## Multi-tenant safety

- [ ] Sensitive org routes use centralized org scope guard
- [ ] RBAC server-side enforced for org actions

## Observability

- [ ] Dashboards created from `docs/operations/dashboards.md`
- [ ] Alerts configured from `docs/operations/alerting.md`
- [ ] SLO policy adopted from `docs/operations/slo.md`
- [ ] `/api/metrics` scraped/monitored

## Reliability

- [ ] `/api/health` monitored
- [ ] `/api/ready` monitored and paged
- [ ] DB backup/restore procedure tested

## Release discipline

- [ ] `pnpm preflight:prod` passes
- [ ] `pnpm --filter ./packages/db exec prisma migrate deploy` completed on target env
- [ ] CI quality gates pass (`lint`, `typecheck`, `test`, `build`)
- [ ] Release tag created via workflow
- [ ] Rollback workflow tested with a known stable tag
