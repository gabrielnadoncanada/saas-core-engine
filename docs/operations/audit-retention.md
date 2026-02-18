# Audit Retention Policy

## Scope

Applique a `org_audit_logs` et `impersonation_sessions`.

## Policy

1. Retention primaire: 180 jours en ligne.
2. Archive froide optionnelle: 365 jours supplementaires (stockage objet chiffre).
3. Suppression definitive apres retention totale.

## Execution

1. Job quotidien:
- purge `org_audit_logs.created_at < now() - interval '180 days'` si non archive.
- purge `impersonation_sessions.started_at < now() - interval '180 days'` si non archive.
2. Journaliser le resultat (nb lignes supprimees, duree, erreurs).
3. Alerter si 2 echecs consecutifs de purge.
