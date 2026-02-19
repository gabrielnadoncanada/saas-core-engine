# Runbook Tool Registry V3

## Objectif

Diagnostiquer une execution de tool AI en production.

## Contrat attendu

Chaque tool doit definir:
1. `schema` (validation args)
2. `authorize` (authz server-side)
3. `timeoutMs`
4. `retries`

## Verification rapide

1. Ouvrir `apps/web/src/server/ai/tools/tools/*.ts`.
2. Verifier la presence des champs du contrat.
3. Verifier les lignes `toolExecutions` associees dans `aI_audit_logs`.

## Incident courant

1. Erreur `Unauthorized tool call`: verifier le contexte org/user.
2. Erreur timeout: augmenter `timeoutMs` ou optimiser query.
3. Erreurs transitoires: ajuster `retries`.
