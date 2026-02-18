# Runbook Audit V2

## Objectif

Investiguer et exporter les evenements audit org avec filtres, pagination et tri.

## Verification rapide

1. Endpoint:
- `GET /api/org/audit`
- `GET /api/org/audit?format=json`
- `GET /api/org/audit?format=csv`
2. Champs attendus:
- `actor_user_id`
- `target_type` / `target_id`
- `diff`
- `ip`
- `user_agent`
- `trace_id`

## Procedure investigation

1. Filtrer par `action` et `outcome`.
2. Filtrer par intervalle (`from`, `to`).
3. Croiser `trace_id` avec la stack de traces.
4. Exporter en CSV pour partage incident.

## Retention

Appliquer une purge periodique sur `org_audit_logs` selon la politique interne de retention.
