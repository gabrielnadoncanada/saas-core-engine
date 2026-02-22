# Go-Live Checklist

## Security

- [ ] `SESSION_COOKIE_SECURE=true` in production
- [ ] `SESSION_COOKIE_SAME_SITE` explicitly set (`lax` or `strict`)
- [ ] Auth rate limiting enabled
- [ ] Stripe webhook secret configured and validated

## Multi-tenant safety

- [ ] Sensitive org routes use centralized org scope guard
- [ ] RBAC server-side enforced for org actions

## Observability

- [ ] OTel enabled in production (`OTEL_ENABLED=true`)
- [ ] OTLP endpoint configured (`OTEL_EXPORTER_OTLP_ENDPOINT`)
- [ ] Dashboards created from `docs/operations/dashboards.md`
- [ ] Alerts configured from `docs/operations/alerting.md`
- [ ] SLO policy adopted from `docs/operations/slo.md`

## Reliability

- [ ] `/api/health` monitored
- [ ] `/api/ready` monitored and paged
- [ ] DB backup/restore procedure tested

## Release discipline

- [ ] `pnpm preflight:prod` passes
- [ ] CI quality gates pass (`lint`, `typecheck`, `test`, `build`)
- [ ] Release tag created via workflow
- [ ] Rollback workflow tested with a known stable tag
