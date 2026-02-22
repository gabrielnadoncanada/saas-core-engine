# Plan d'implementation V2 / V3

Ce document sert de reference unique pour implementer les evolutions V2 et V3 definies dans `creation__docs/PRD.md` et `creation__docs/Vision.md`.

## Objectif

- V2: Agency Pack (RBAC avance, audit avance, impersonation)
- V3: AI Automation Pack (assistant AI, tool registry, webhook retry)

## Regles d'execution

1. Pas de backward compatibility par defaut.
2. Une seule source de verite par logique.
3. Suppression des chemins legacy des qu'une nouvelle implementation remplace l'ancienne.
4. Chaque epic doit inclure tests + observabilite + runbook.

## V2 - Agency Pack (6 a 8 semaines)

### Epic V2.1 - RBAC avance (2 a 3 semaines)

#### Scope

- Etendre `@rbac-core` avec policies conditionnelles par ressource.
- Introduire des roles/permissions custom en base.
- Ajouter UI d'administration des permissions.

#### Taches

1. Ajouter tables: `roles`, `permissions`, `role_permissions`, `membership_roles`.
2. Etendre `can(user, action, resource, context)` pour conditions fines.
3. Creer endpoints admin de gestion roles/permissions.
4. Ajouter page dashboard "Roles & Permissions".

#### Done

- Roles custom assignables par organisation.
- `can(...)` couvre roles par defaut + custom.
- Tests unitaires/integration complets.

### Epic V2.2 - Audit logs avances (1 a 2 semaines)

#### Scope

- Rendre les logs audit queryables, filtrables et exportables.

#### Taches

1. Etendre schema audit: actor, target, diff, ip, userAgent, traceId.
2. Ajouter endpoint query (`filters`, `pagination`, `sort`).
3. Ajouter export CSV/JSON.
4. UI table audit avec filtres.

#### Done

- Export operationnel.
- Index DB adaptes aux requetes frequentes.
- Politique de retention explicite.

### Epic V2.3 - Impersonation securisee (1 a 2 semaines)

#### Scope

- Permettre a un admin/support d'impersoner un utilisateur avec controle strict.

#### Taches

1. Ajouter flow start/stop impersonation cote serveur.
2. Ajouter banniere UI "Impersonation active".
3. Journaliser debut/fin et actions sensibles.
4. Bloquer impersonation de comptes critiques (owner) hors procedure.

#### Done

- Traçabilite complete.
- Guard server-side strict.
- Tests e2e du flux complet.

### Epic V2.4 - Hardening ops V2 (1 semaine)

#### Scope

- Stabiliser l'exploitation prod des features V2.

#### Taches

1. Ajouter runbooks RBAC/audit/impersonation.
2. Ajouter alertes dediees securite.
3. Etendre `pnpm preflight:prod` avec checks V2.

#### Done

- Alerting actif.
- Runbooks valides en simulation incident.

## V3 - AI Automation Pack (8 a 10 semaines)

### Epic V3.1 - AI Assistant Panel (2 semaines)

#### Scope

- Assistant AI multi-org integre au dashboard.

#### Taches

1. Ajouter UI assistant avec streaming.
2. Ajouter enforcement RBAC sur actions AI.
3. Journaliser usage/cout par org.

#### Done

- Quotas appliques.
- Audit AI visible dans dashboard.

### Epic V3.2 - Tool Registry production (2 semaines)

#### Scope

- Standardiser les tools AI pour execution fiable.

#### Taches

1. Contrat unique tool: schema, authz, timeout, retries.
2. Exposer tools metier (org, billing, users) avec controle d'acces.
3. Ajouter tests contractuels par tool.

#### Done

- Tous les tools critiques conformes au contrat unique.
- Observabilite par outil (latence, erreurs, succes).

### Epic V3.3 - Traitements asynchrones applicatifs (2 a 3 semaines)

#### Scope

- Ajouter des traitements asynchrones robustes sans dependance worker dedie.

#### Taches

1. Ajouter primitives de retry/reprise cote application.
2. Migrer les traitements longs hors requete interactive quand necessaire.
3. Documenter le replay et les incidents operationnels.

#### Done

- Retry/backoff operationnels.
- Runbook incidents disponibles.

### Epic V3.4 - Webhook retry engine (1 a 2 semaines)

#### Scope

- Fiabiliser ingestion/replay webhooks.

#### Taches

1. Validation signature + traitement direct idempotent.
2. Idempotency store + replay CLI.
3. Gestion ordering/duplicates.

#### Done

- Replay teste.
- Idempotence prouvee en test d'integration.

### Epic V3.5 - Gouvernance couts AI (1 semaine)

#### Scope

- Controle budget et consommation AI par organisation.

#### Taches

1. Budget mensuel par org/plan.
2. Alertes burn rate cout AI.
3. Blocage automatique au depassement.

#### Done

- Enforcement budget actif.
- Alertes exploitables par on-call.

## Ordre recommande (dependances)

1. V2.1 RBAC avance
2. V2.2 Audit avance
3. V2.3 Impersonation
4. V3.2 Tool Registry
5. V3.3 Traitements asynchrones applicatifs
6. V3.4 Webhook Retry
7. V3.1 Assistant Panel
8. V3.5 Gouvernance couts AI

## Jalons de validation

1. Fin V2:
- RBAC custom + audit queryable + impersonation securisee en production.

2. Fin V3:
- Flows AI metier robustes avec retry, budget control et observabilite complete.

## Commandes de verification recommandees

```bash
pnpm preflight:prod
pnpm typecheck
pnpm test
```

## Reference

- `creation__docs/PRD.md`
- `creation__docs/Vision.md`
