# Analyse org-core vs PRD/Vision et écarts de “prod readiness” — repo gabrielnadoncanada/saas-core-engine

## Résumé exécutif

Le PRD et la Vision positionnent **SaaS Core Engine** comme un template “production‑ready” très rapide à déployer, avec **multi‑tenancy (orgs)**, **rôles**, **invites**, audit, et une architecture modulaire (packages core + couche Next.js) (PRD, Vision). fileciteturn14file2L1-L1 fileciteturn14file0L1-L1

Dans le code, le module **`@org-core`** est bien structuré autour de **services métier** (OrgService / MembershipService / InviteService) et d’un modèle **ports/adapters** via interfaces de repos + transactions. C’est une fondation saine, déjà testée (unit tests + test de concurrence), et intégrée aux routes Next.js via un adapter dédié. fileciteturn21file0L1-L1 fileciteturn25file2L1-L1 fileciteturn25file3L1-L1 fileciteturn16file0L1-L1

Cependant, pour être **vraiment “prod ready”** *au sens opérationnel* (sécurité anti‑abus, observabilité, runbooks, SLO/alerting, CI/CD release/rollback, etc.) et **aligné** avec la Vision (RBAC, admin dashboard “complet”), il reste des écarts importants. Les plus bloquants avant une mise en production (ou avant de vendre en promettant “production‑grade”) sont :

- **Écart Vision ↔ implémentation sur le RBAC** : la Vision décrit un **RBAC engine** (permission matrix, `can(user, action, resource)`, middleware guard) mais l’implémentation actuelle est surtout **rôles coarse-grained** (owner/admin/member) et des checks ciblés au niveau membership/org. Si tu “vends RBAC” (ou si la Vision sert de promesse produit), c’est un **P0** de vérité produit. fileciteturn14file0L1-L1 fileciteturn25file3L1-L1
- **Anti‑abus** sur les endpoints sensibles (ex. invite) : le endpoint d’invitation crée des tokens et envoie des emails; il n’y a pas (dans l’analyse de ces fichiers) de **rate limiting**/quotas sur les actions org (contrairement aux flows auth qui appellent un rate limit). Ça expose facilement à du spam et à des coûts/blacklisting. **P0**. fileciteturn35file1L1-L1 fileciteturn37file6L1-L1
- **Observabilité “3 signaux” (logs/metrics/traces) + SLO/alerting** : le repo a un audit log org en DB (bon début), mais il manque la couche standardisée d’opérations (corrélation, métriques, traces, endpoints santé). Sans ça, tu ne peux pas opérer en prod proprement; c’est un **P0** si l’objectif est “production‑ready”. fileciteturn97file0L1-L1 citeturn0search1 citeturn0search5
- **Contrats/API** : `@contracts` a Zod en dépendance, mais la partie org observée est centrée sur des types et les routes manipulent des `type Body = ...` + validation minimale inline. Tu as un risque de divergence des payloads/erreurs et une DX moins “starter kit premium”. **P1** (ou **P0** si tu vends “type-safe contracts”). fileciteturn65file16L1-L1 fileciteturn63file0L1-L1 fileciteturn35file1L1-L1
- **CI existante mais pipeline release/rollback absent** : il y a une CI (lint/typecheck/test/audit) + CodeQL, mais pas de stratégie versioning, release notes, artefacts, promotion d’environnements, rollback. **P1** pour un template, **P0** si tu opères une prod réelle multi‑env. fileciteturn73file0L1-L1 fileciteturn73file1L1-L1

## Portée et méthode d’analyse

Cette analyse compare :

- Les **exigences / promesses** du **PRD V1** et du document **Vision** dans `creation__docs/` (incluant multi‑tenancy, invites, rôles et exigences d’architecture). fileciteturn14file2L1-L1 fileciteturn14file0L1-L1
- L’implémentation réelle du module **`packages/org-core`** (services + ports + tests) et sa **couche d’intégration** dans Next.js (`apps/web/src/server/adapters/core/org-core.adapter.ts` + routes `/api/org/*`). fileciteturn21file0L1-L1 fileciteturn16file0L1-L1 fileciteturn35file1L1-L1
- Les éléments “prod-ready” demandés (sécurité, observabilité, tests, CI/CD, perf, fiabilité, conformité, déploiement, doc, DX, config, monitoring/alerting, SLO/SLI, release notes), en priorisant ce qui bloque un lancement. Le repo contient aussi le schéma Prisma (important pour multi‑tenancy). fileciteturn51file0L1-L1

Quand pertinent, je m’appuie sur des références externes “primary/official” (SRE Google, OpenTelemetry, Stripe, OWASP). citeturn0search5turn0search1turn0search2turn1search0

## État actuel et structure réelle du module org-core

Le module **`@org-core`** est organisé en trois services :

- `OrgService`: création d’organisation, changement d’org active, liste des orgs d’un user. fileciteturn21file0L1-L1  
- `MembershipService`: garde-fous de rôles (owner/admin/member) et opérations (changer rôle, retirer membre, transfert ownership). fileciteturn25file3L1-L1  
- `InviteService`: émission d’invites (token + hash + expiry), acceptation d’invite (idempotente) et listing d’invites pending. fileciteturn25file2L1-L1  

Le “contracts boundary” se fait via `org.ports.ts` (interfaces repo + TxRunner + InviteToken). fileciteturn63file5L1-L1  
L’intégration Next.js instancie les repos Prisma, la transaction `withTx`, et un `inviteToken` basé sur `crypto.randomBytes(...).toString("base64url")` + hashing avec pepper. fileciteturn16file0L1-L1

Exemple de logique métier déjà en place (création org + membership owner + subscription + org active) :

```ts
await this.memberships.create({ userId, organizationId: org.id, role: "owner" }, tx);
await this.subs.upsertOrgSubscription({ organizationId: org.id, plan: "free", status: "inactive" }, tx);
await this.users.setActiveOrganization(userId, org.id, tx);
```

Le comportement ci-dessus existe à la fois dans `OrgService` et dans le flow signup côté auth-core (duplication fonctionnelle à surveiller). fileciteturn21file0L1-L1 fileciteturn95file2L1-L1

L’acceptation d’invite est pensée pour être **idempotente et concurrency-safe** (gestion de conflits “unique” simulée avec le code Prisma `P2002` — ce qui révèle aussi une fuite d’implémentation DB dans le core). fileciteturn25file2L1-L1 fileciteturn25file0L1-L1

### Diagramme d’architecture (réel) autour de org-core

```mermaid
flowchart LR
  subgraph Contracts["@contracts"]
    C1[types & erreurs org]
  end

  subgraph OrgCore["@org-core"]
    OS[OrgService]
    MS[MembershipService]
    IS[InviteService]
    P[Ports: OrgsRepo/MembershipsRepo/... + TxRunner + InviteToken]
  end

  subgraph Web["apps/web (Next.js)"]
    A[org-core.adapter.ts]
    R1[/api/org/create]
    R2[/api/org/switch]
    R3[/api/org/invite]
    R4[/api/org/invite/accept]
    R5[/api/org/members/*]
  end

  subgraph DB["@db + Prisma schema"]
    PR[Prisma client]
    T[(tables: organizations, memberships, invitations, subscriptions, users.activeOrganizationId)]
  end

  Contracts --> OrgCore
  C1 --> OS
  C1 --> MS
  C1 --> IS
  P --> OS
  P --> MS
  P --> IS

  A --> OS
  A --> MS
  A --> IS
  R1 --> A
  R2 --> A
  R3 --> A
  R4 --> A
  R5 --> A

  A --> PR --> T
```

L’existence des routes org et de l’adapter est confirmée par les fichiers : adapter core, routes create/switch/invite/accept + routes membership. fileciteturn16file0L1-L1 fileciteturn21file1L1-L1 fileciteturn37file17L1-L1 fileciteturn35file1L1-L1 fileciteturn16file15L1-L1 fileciteturn35file8L1-L1

## Tableau PRD/Vision vs implémentation réelle

Le tableau ci-dessous compare des affirmations **pertinentes pour org-core** (fonctionnel + architecture + sécurité) aux preuves dans le repo.

| Thème | PRD / Vision (claim) | Implémentation observée | Statut | Preuves |
|---|---|---|---|---|
| Création d’org | “Create org” + org auto‑created au signup (PRD) | `OrgService.createOrg(...)` + signup flow crée org + membership owner + subscription + active org | Présent | fileciteturn21file0L1-L1 fileciteturn95file2L1-L1 |
| Switch org | “Switch org” (PRD) | `switchActiveOrganization` vérifie membership avant `setActiveOrganization` + route `/api/org/switch` | Présent | fileciteturn21file0L1-L1 fileciteturn37file17L1-L1 |
| Inviter membres | “Invite team members” (PRD/Vision) | `InviteService.createInvite` restreint à owner/admin + route `/api/org/invite` envoie email | Présent | fileciteturn25file2L1-L1 fileciteturn35file1L1-L1 |
| Accept invite | “Accept invite flow” (PRD/Vision) | `acceptInvite` valide token + email match + membership ensure + active org; route `/api/org/invite/accept` redirect UI | Présent | fileciteturn25file2L1-L1 fileciteturn16file15L1-L1 |
| Rôles | “Roles fixed: owner/admin/member” (PRD/Vision) | Enum Prisma `MembershipRole` + logique d’autorisation membership service | Présent | fileciteturn51file0L1-L1 fileciteturn25file3L1-L1 |
| “Org isolation enforced server-side” | PRD l’exige explicitement | Certaines opérations vérifient membership (switch, role change, removal). Mais pas de mécanisme central garantissant que *toutes* les queries app & services sont org‑scoped (pattern global non démontré ici) | Partiel | fileciteturn21file0L1-L1 fileciteturn25file3L1-L1 fileciteturn14file2L1-L1 |
| RBAC engine | Vision décrit un vrai RBAC (permissions, `can()`, middleware) | Pas de package RBAC dédié dans la portée org-core; on a des checks “owner/admin/member” et des règles spécifiques | Manquant (selon Vision) | fileciteturn14file0L1-L1 fileciteturn25file3L1-L1 |
| Audit logs | Vision mentionne audit logs | Service `logOrgAudit` écrit en DB + routes org loggent des actions | Partiel (org seulement) | fileciteturn97file0L1-L1 fileciteturn21file1L1-L1 |
| Contracts Zod (DX) | PRD veut schemas Zod partagés | `@contracts` dépend de Zod mais contrats org observés sont surtout types; routes valident inline | Partiel | fileciteturn65file16L1-L1 fileciteturn63file0L1-L1 fileciteturn35file1L1-L1 |
| “Framework-agnostic core” | Vision (principe) | org-core a un helper `isUniqueConstraintViolation` qui reconnaît `P2002` (Prisma) → fuite d’implémentation DB | Partiel | fileciteturn25file0L1-L1 fileciteturn14file0L1-L1 |
| DB schema | PRD décrit tables org/membership/invitations | Prisma schema contient `Organization`, `Membership`, `Invitation`, et `User.activeOrganizationId` | Présent | fileciteturn51file0L1-L1 fileciteturn14file2L1-L1 |
| CI | Non détaillé dans PRD, mais requis “prod-grade” | GitHub Actions CI lint/typecheck/test/audit + CodeQL | Présent (base) | fileciteturn73file0L1-L1 fileciteturn73file1L1-L1 |

## Lacunes “prod ready” prioritaires et plan d’implémentation

Le backlog ci‑dessous est volontairement **orienté blockers**. Pour chaque item : priorité, étapes concrètes, effort (S/M/L) avec ordre de grandeur en heures, et critères d’acceptation.

> Convention effort : **Small 4–12h**, **Medium 12–40h**, **Large 40–120h** (selon profondeur + intégrations).

| Dimension | Item manquant / à renforcer | Priorité | Effort | Étapes d’implémentation concrètes | Critères d’acceptation |
|---|---|---:|---:|---|---|
| Fonctionnel (Vision) | RBAC engine (permissions + `can()` + guards) tel que décrit dans Vision | P0 | Large (60–120h) | Créer `packages/rbac-core` (ou `rbac`) avec : (1) modèle permission (actions/ressources) + matrice, (2) helpers `can(user, action, resource)` et `requirePermission`, (3) intégration dans routes via middleware/util server, (4) tests unit + exemples. | Démo : une action protégée “admin-only” échoue côté server même si UI tente l’appel; `can()` couvert par tests; doc + exemples. fileciteturn14file0L1-L1 |
| Sécurité (anti-abus) | Rate limiting / quotas pour invites (email) + actions sensibles org | P0 | Medium (16–32h) | (1) Ajouter un “org action rate limit adapter” (DB buckets ou Redis) dédié aux invites, (2) limiter par `orgId + actorUserId` + “global per IP/email”, (3) intégrer dans `/api/org/invite` avant émission token/email, (4) logs + audit outcome. | Tests: burst 50 req/min → 429; quotas distincts par org; pas de spam email; métrique `org_invite_rate_limited_total`. fileciteturn35file1L1-L1 |
| Sécurité (session/cookies) | Vérification explicite des attributs cookie + guidelines (Secure/HttpOnly/SameSite) et HSTS/TLS en prod | P0 | Small (6–12h) | (1) Documenter et valider `Secure`, `HttpOnly`, `SameSite` selon env, (2) ajouter tests unit sur l’adapter cookie, (3) ajouter en-têtes sécurité (HSTS, etc.) via middleware/next config, (4) doc “production hardening”. | En prod : cookies session toujours `Secure`+`HttpOnly`; SameSite explicit; doc explique pourquoi; aligné recommandations OWASP. citeturn1search0 |
| Observabilité | Standardiser logs structurés + corrélation (requestId/traceId) | P0 | Medium (20–40h) | (1) Ajouter un logger structuré (pino/winston) + middleware qui injecte `requestId`, (2) inclure `organizationId`, `userId`, `route`, `outcome`, (3) enrichir `logOrgAudit` et erreurs org, (4) exposer format JSON stable. | Un incident peut être investigué via logs filtrés par requestId; logs contiennent orgId/actor; erreurs ont codes stables; pas de données sensibles en clair. fileciteturn97file0L1-L1 |
| Observabilité | Metrics + tracing (OpenTelemetry) pour endpoints `api/*` | P0 | Large (40–80h) | (1) Instrumenter serveur avec OpenTelemetry (traces + métriques), (2) exporter (OTLP) vers collector, (3) inclure attributs (orgId, route, status, errorCode), (4) dashboards de base : latency p50/p95, error rate, invite sends, auth failures. | Traces visibles bout‑à‑bout; métriques par route; corrélation logs↔traces via traceId/spanId (concept OTel). citeturn0search1 |
| Fiabilité | Health checks (liveness/readiness) + dépendances (DB, Stripe, Email) | P0 | Medium (12–24h) | (1) Ajouter `/api/health` (liveness) et `/api/ready` (readiness) décidés sur checks DB, (2) timeouts courts + fallback, (3) doc d’exploitation. | `/api/ready` échoue si DB down; monitoring peut pager; tests d’intégration couvrent scénarios DB down. |
| SLO/SLI | Définir SLI/SLO + error budget + policy de release | P0 | Medium (16–32h) | (1) Choisir SLI : taux succès req, latence, taux erreurs invites, (2) SLOs (ex. 99.9% sur 28 jours) + error budget, (3) lier à policy (freeze release si budget brûlé), (4) documenter. | Un doc SLO existe + calcul budget; dashboard montre burn; règle “freeze hors P0” appliquée (modèle SRE). citeturn0search5turn0search0 |
| API & contracts | Contrats org en Zod + mapping erreurs stable (server/client) | P1 | Medium (16–40h) | (1) Ajouter schemas Zod pour payloads org (create/switch/invite/role/remove/transfer), (2) types `Result<T, E>` standard, (3) adapter routes pour valider via schema, (4) tests sur invalid payload. | Les routes rejettent payload invalid avec erreurs cohérentes; SDK client réutilise types; pas de validation divergente. fileciteturn65file16L1-L1 |
| Data & migrations | Versionner/valider migrations Prisma + stratégie migration prod | P1 | Medium (12–32h) | (1) S’assurer que `prisma/migrations` est complet et committé, (2) ajouter CI step “migrate diff” ou “validate migrate deploy dry run”, (3) doc rollback (down migrations) ou stratégie “expand/contract”. | `pnpm setup` fonctionne sur clone propre; CI échoue si migrations manquantes; doc explique comment migrer en prod. fileciteturn96file0L1-L1 fileciteturn96file1L1-L1 |
| Sécurité (webhooks) | Procédure robuste webhook (replay, tolérance, ack rapide, rotation secrets) | P1 | Medium (16–32h) | (1) Vérifier signature Stripe + tolérance timestamp, (2) ack 2xx rapide + traitement async, (3) rotation secrets documentée, (4) tests sur replay/duplicate. | Webhook rejette signature invalide; gère replay; événements dupliqués idempotents; doc suit recommandations Stripe. citeturn0search2 |
| Testing | Couverture et niveaux (unit/integration/e2e) + targets | P1 | Medium (20–60h) | (1) Établir target coverage (ex. 80% lines packages core), (2) ajouter tests intégration (DB + routes), (3) e2e Playwright sur flows clés (signup→invite→accept), (4) ajouter job CI coverage gate. | CI échoue si coverage < target; e2e passe en CI; un test d’intégration valide org isolation sur queries DB. fileciteturn73file0L1-L1 |
| CI/CD | Release pipeline (tags, changelog, artefacts) + rollback | P1 | Medium (20–40h) | (1) Conventional commits + génération changelog, (2) workflow release qui build + archive + tag, (3) notes de release auto, (4) stratégie rollback (revert/tag, env promotion). | Une release crée tag + notes; build Next vérifié; rollback documenté; environnements “preview/staging/prod” définis. fileciteturn73file0L1-L1 |
| Perf & scalabilité | Benchmarks + load tests (smoke) sur endpoints org | P2 | Medium (16–40h) | (1) k6 (ou autocannon) scripts : invite/create/switch/list, (2) budgets latence p95, (3) test de DB indexes (membership unique/index), (4) doc perf. | Rapport perf versionné; p95 sous budget; pas de régression perf en CI. fileciteturn51file0L1-L1 |
| Confidentialité | Politique rétention + minimisation données (audit logs, emails) | P2 | Small–Medium (8–24h) | (1) Lister PII (email, ip, userAgent), (2) minimiser + redaction, (3) règles de rétention purge/TTL, (4) doc privacy. | Audit logs ne contiennent pas secrets; purge automatique configurée; doc “privacy-by-design” minimale. |
| Déploiement | Manifests/IaC (ou guide Vercel complet) | P2 | Medium (16–40h) | (1) Choisir “Vercel-first” : env vars, DB, webhooks, domains, (2) ajouter `vercel.json` si nécessaire, (3) runbook “incident: DB down / Stripe webhook backlog”, (4) checklist go-live. | Un dev suit le guide et déploie sans guess; runbook existe; variables prod listées; scénario de rollback décrit. fileciteturn19file1L1-L1 |

### Points d’attention spécifiques à org-core (design/architecture)

- **Fuite Prisma (P2002) dans le core** : `isUniqueConstraintViolation` reconnaît explicitement `P2002`, ce qui va à l’encontre du principe “framework‑agnostic core” de la Vision (même si c’est léger). Recommandation : abstraire via un “UniqueViolationError” levé par repos, ou injecter une fonction “isUniqueViolation(err)” depuis l’adapter DB. fileciteturn25file0L1-L1 fileciteturn14file0L1-L1
- **Duplication “create org”** : la création d’organisation et des artefacts associés existe dans `OrgService` et aussi dans le `SignupFlow` auth-core. Ça augmente le risque de divergence (ex. si tu changes le plan par défaut, tu dois modifier 2 endroits). Recommandation : (a) faire dépendre signup.flow d’`@org-core` via un port (à valider avec tes règles de dépendance), ou (b) extraire une fonction pure partagée dans org-core (sans dépendre auth‑core). fileciteturn21file0L1-L1 fileciteturn95file2L1-L1
- **Org isolation “global”** : plusieurs actions sont protégées par membership, mais “org isolation” en prod est surtout un **invariant transversal** : *toute requête data doit être automatiquement scopée par orgId* (ou doit prouver pourquoi non). Sans guard central, tu vas inévitablement introduire un endpoint “qui oublie le orgId”. Recommandation : un helper `requireOrgContext()` qui renvoie `{orgId, role}` + un wrapper repo/service qui exige orgId pour les opérations multi‑tenant.

## Checklist prod‑readiness (priorisée)

Cette checklist est conçue comme “Go/No‑Go” avant un lancement prod (ou avant de vendre en affirmant “production‑ready”).

- [ ] (P0) RBAC aligné avec la Vision (ou ajuster la Vision/marketing pour refléter la réalité). fileciteturn14file0L1-L1  
- [ ] (P0) Rate limiting/quotas sur invites + actions org sensibles. fileciteturn35file1L1-L1  
- [ ] (P0) Observabilité : logs structurés + métriques + traces (OTel) + corrélation. citeturn0search1  
- [ ] (P0) Health/readiness endpoints et monitoring de base.  
- [ ] (P0) SLO/SLI définis + error budget + policy de release (freeze hors P0 si budget brûlé). citeturn0search5turn0search0  
- [ ] (P1) Contracts org en Zod + erreurs/API stables, réutilisables côté client. fileciteturn65file16L1-L1  
- [ ] (P1) Migrations Prisma versionnées + validation en CI; migration strategy documentée. fileciteturn96file0L1-L1  
- [ ] (P1) Pipeline release : build Next en CI + release notes + rollback. fileciteturn73file0L1-L1  
- [ ] (P1) Tests : intégration DB + e2e (signup→invite→accept) + coverage targets. fileciteturn73file0L1-L1  
- [ ] (P1) Webhooks Stripe : replay/idempotency/rotation secrets/ack rapide (si vendu “prod-grade”). citeturn0search2  
- [ ] (P2) Benchmarks/load tests + budgets latence (k6).  
- [ ] (P2) Privacy : PII minimization + rétention/purge + redaction dans logs.  
- [ ] (P2) Déploiement : guide Vercel/infra + runbooks incident.

### Mini‑flowchart recommandé pour “org invite” (hardening)

```mermaid
flowchart TD
  A[POST /api/org/invite] --> B{Auth OK?}
  B -- non --> X[401]
  B -- oui --> C{Rate limit OK?}
  C -- non --> Y[429 + audit outcome=forbidden]
  C -- oui --> D[CreateInvite: token + hash + expires]
  D --> E[Send email (async)]
  E --> F[Audit log org.invite.created]
  F --> G[200 OK]
```

Ce flow formalise ce qui est déjà partiellement en place (auth + core + audit), et ajoute le bloc anti‑abus manquant pour tenir une promesse “production‑grade”. fileciteturn35file1L1-L1 fileciteturn97file0L1-L1

