# Runbook Impersonation V2

## Objectif

Utiliser l'impersonation de facon securisee pour support/debug sans perte de tracabilite.

## Garde-fous

1. Seuls owner/admin peuvent demarrer une impersonation.
2. Les comptes `owner` ne sont pas impersonables.
3. Debut/fin d'impersonation journalises:
- `org.impersonation.started`
- `org.impersonation.stopped`

## Procedure

1. Ouvrir `Dashboard > Roles & Permissions`.
2. Dans la table membership, cliquer `Start` sur l'utilisateur cible.
3. Verifier la banniere `Impersonation active`.
4. Executer uniquement le diagnostic necessaire.
5. Cliquer `Stop`.

## Verification post-action

1. Controler les logs audit:
- debut present
- fin presente
- actions sensibles taguees via metadata impersonation
2. Confirmer la suppression du cookie d'impersonation.
