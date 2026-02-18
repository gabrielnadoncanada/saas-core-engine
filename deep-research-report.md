# Audit production-ready de `packages/org-core` dans `gabrielnadoncanada/saas-core-engine`

## Résumé exécutif, verdict et score de maturité

`org-core` implémente déjà un **noyau multi-tenant solide** et majoritairement conforme à la Vision/PRD V1: création d’organisation en transaction avec création de membership owner, abonnement “free/inactive” initial, mécanisme “active organization” côté user, switch d’org (avec vérification membership), invitations sécurisées (token brut jamais stocké, hash unique en DB, TTL borné), acceptation d’invite transactionnelle avec upsert de membership et protection contre races, RBAC (owner/admin/member) avec règles “dernier owner” et transfert d’ownership, ainsi qu’un **audit trail** via `OrgAuditLog`. Les facteurs qui empêchent encore de conclure “production-ready” sont surtout **opérationnels et DX**: naming/casing des docs (vos fichiers sont `prd.md` et `vision.md`, pas `PRD.md`/`Vision.md`), la logique d’“org active” est **par utilisateur** (impact transverse sur toutes les sessions, alors que le PRD parle “par session/user context”), l’e-mail d’invitation réutilise une méthode `sendVerifyEmail` (ambigu et risqué UX), l’absence d’API/UI d’admin d’équipe (changer rôle/retirer membre/transférer ownership) malgré les services core existants, et une couverture de tests essentiellement unitaire (peu ou pas de tests d’intégration DB, de races réelles, ou d’E2E). Verdict: **prod-ready = non**, mais vous êtes proche.

**État prod-ready:** **non**  
**Score maturité (0–100): 78 / 100**

Critères (pondération et score):
- Alignement PRD/Vision (20): 16/20 (docs présentes mais casing; features présentes, “per session” ambigu)
- Fonctionnalité & invariants org-core (25): 21/25 (core complet, manque API/UI d’admin)
- DB integrity & transactions (15): 14/15 (contraintes + tx + upserts)
- Sécurité & contrôle d’accès + audit (15): 13/15 (checks au bon endroit + audit log; reste idempotence invite UX)
- Tests (15): 9/15 (bons unit tests; manque intégration/race/e2e)
- CI/CD & release (10): 5/10 (scripts ok; scans/workflows/changelog **non spécifiés**)

## Démarche, périmètre, limites

### Étapes effectuées (api_tool GitHub)

J’ai commencé par le connecteur GitHub (seul connecteur activé), puis j’ai:
- utilisé `api_tool` (GitHub) en **search** pour localiser `packages/org-core` et `creation__docs`,
- utilisé `api_tool` (GitHub) en **fetch** pour lire:
  - `creation__docs/prd.md` et `creation__docs/vision.md`,
  - les fichiers source clés de `packages/org-core/src/*`,
  - les routes Next.js concernées (`apps/web/src/app/api/org/*`),
  - l’adapter `apps/web/src/server/adapters/core/org-core.adapter.ts`,
  - le schéma Prisma `packages/db/prisma/schema.prisma`,
  - le tx runner `packages/db/src/tx.ts`,
  - les repos DB utilisés par `org-core` côté app (`apps/web/src/server/db-repos/*`),
  - les tests unitaires `packages/org-core/src/*.test.ts`,
  - et le flow billing webhook (pour le diagramme “billing hook → revoke”).

### Fichiers analysés (paths exacts)

Docs:
- `creation__docs/prd.md`
- `creation__docs/vision.md`  
Note: les noms attendus dans ta consigne (`PRD.md`, `Vision.md`) n’existent pas; ce sont des variantes **en minuscules**.

Org-core:
- `packages/org-core/package.json`
- `packages/org-core/src/index.ts`
- `packages/org-core/src/org.ports.ts`
- `packages/org-core/src/org.service.ts`
- `packages/org-core/src/membership.service.ts`
- `packages/org-core/src/invite.service.ts`
- `packages/org-core/src/errors.ts`
- `packages/org-core/src/org.service.test.ts`
- `packages/org-core/src/invite.service.test.ts`
- `packages/org-core/src/membership.service.test.ts`

App/adapters/DB:
- `apps/web/src/server/adapters/core/org-core.adapter.ts`
- `apps/web/src/app/api/org/create/route.ts`
- `apps/web/src/app/api/org/invite/route.ts`
- `apps/web/src/app/api/org/invite/accept/route.ts`
- `apps/web/src/app/api/org/switch/route.ts`
- `apps/web/src/server/auth/require-org.ts`
- `apps/web/src/server/auth/require-user.ts`
- `apps/web/src/server/auth/org-error-response.ts`
- `apps/web/src/server/services/org-audit.service.ts`
- `apps/web/src/server/db-repos/orgs.repo.ts`
- `apps/web/src/server/db-repos/memberships.repo.ts`
- `apps/web/src/server/db-repos/invitations.repo.ts`
- `apps/web/src/server/db-repos/subscriptions.repo.ts`
- `apps/web/src/server/db-repos/users.repo.ts`
- `packages/db/src/tx.ts`
- `packages/db/prisma/schema.prisma`

Billing (pour le flow demandé):
- `apps/web/src/app/api/billing/webhook/route.ts`
- `packages/billing-core/src/subscription/subscription.sync.ts`

### Limites et note sur les citations repo

Je ne peux pas produire de citations “`filecite`” sur le contenu GitHub dans cet environnement (l’outil de citations internes n’est pas connecté au repo). J’ai donc appuyé toutes les constatations “repo” sur **chemins exacts + extraits**. Pour les recommandations normatives, j’ai utilisé des sources officielles (OWASP, Stripe) avec citations web.

## Analyse par dimension

### Alignement produit vs PRD/Vision

**PRD et Vision demandent clairement**:
- multi-tenant avec memberships multi-org et une org active “par session/user context” (`creation__docs/prd.md` & `creation__docs/vision.md`),
- create org, switch org, invite, accept, rôles fixes owner/admin/member, isolation server-side.

**Implémentation observée**:
- Create org: `OrgService.createOrg()` crée org + membership owner + subscription free/inactive + `users.setActiveOrganization(...)` *dans une transaction* (`packages/org-core/src/org.service.ts`).
- Switch org: route `POST /api/org/switch` valide membership et met à jour `user.activeOrganizationId` (`apps/web/src/app/api/org/switch/route.ts`).
- “Active org”: `requireUser()` reconstruit `organizationId` à partir de `user.activeOrganizationId`, vérifie que le user est bien membre de cette org, sinon fallback sur la première membership (`apps/web/src/server/auth/require-user.ts`).
- Invite/accept: token brut généré en adapter, hashé via `hashToken` (auth-core) avec `TOKEN_PEPPER`, stockage en DB avec `@unique token_hash`, acceptation transactionnelle (`packages/org-core/src/invite.service.ts`, `apps/web/.../org-core.adapter.ts`, `schema.prisma`).

**Écarts notables**:
- **Casing des docs**: `creation__docs/prd.md` et `creation__docs/vision.md` (minuscules) alors que vous référencez souvent “PRD/Vision” comme si c’était standard. Sur Linux/CI, ce détail casse rapidement scripts, linking, automations.
- **“per session/user context”**: dans les faits, `activeOrganizationId` est stocké sur le **User** (et non la Session). Donc un switch org affecte toutes les sessions actives de cet utilisateur (au prochain accès). Si votre interprétation produit de “per session” est stricte, c’est un gap.

### Fonctionnalité org-core: création, management, rôles/permissions, idempotence, subscriptions

**Création org & subscription**  
`OrgService.createOrg` est transactionnel et établit l’état minimal SaaS: org, membership owner, subscription free inactive, org active (`packages/org-core/src/org.service.ts`). C’est aligné PRD (une subscription org-based; free/pro).

**Invitations**  
`InviteService.createInvite` fait l’autorisation *dans le core* (owner/admin uniquement), génère token brut (via port), stocke hash unique, clamp TTL (min 60 min, max 7 jours), retourne token brut pour mail (`packages/org-core/src/invite.service.ts`). Ça respecte l’esprit OWASP “checks au bon endroit” et “validate permissions on every request”. citeturn6search0

`InviteService.acceptInvite` est transactionnel, vérifie:
- invite valide (hash + expiresAt + acceptedAt null via repo),
- user authentifié,
- email match strict (case-insensitive),
- membership upsert (idempotence partielle),
- marque l’invite acceptée “if pending” (updateMany conditionnel),
- active org basculée vers l’org acceptée (`packages/org-core/src/invite.service.ts`).

**RBAC / rôles / admin d’équipe**  
`MembershipService` est plus mature qu’un “MVP”: il implémente `changeMemberRole`, `removeMember`, `transferOwnership`, avec des protections:
- admin ne peut agir que sur des `member`,
- blocage de la démotion/suppression du **dernier owner**,
- transfert d’ownership owner-only (`packages/org-core/src/membership.service.ts`).

**Ce qui manque côté produit**: malgré le core, aucune route/UI d’admin d’équipe ne consomme ces méthodes (la page Team liste seulement). Donc la promesse Vision “Role assignment” est **partiellement livrée** (core oui, produit non).

**Constraint “unique org per user”**  
Ta demande mentionne “unique org per user”, mais le PRD/Vision disent explicitement multi-org memberships. Dans le repo, la contrainte effective est plutôt: **unicité membership (userId, organizationId)** via `@@unique([userId, organizationId])` (`schema.prisma`). Donc “unique org per user” est **non requis** et contredirait votre vision multi-tenant telle qu’écrite (à moins d’un pivot produit).

### DB integrity & transactions (Prisma + TxRunner)

- Contrainte d’unicité membership: `Membership @@unique([userId, organizationId])` (`schema.prisma`).
- Contrainte d’unicité invite: `Invitation tokenHash @unique` (`schema.prisma`).
- Contrainte subscription: `Subscription organizationId @unique` + ids Stripe uniques (`schema.prisma`).
- Patterns atomiques: `markAcceptedIfPending` via `updateMany(where acceptedAt: null)` (`apps/web/src/server/db-repos/invitations.repo.ts`).
- TxRunner standard: `withTx(fn) => prisma.$transaction(...)` (`packages/db/src/tx.ts`).

Globalement, l’intégrité DB est bonne et les opérations critiques sont transactionnelles au core (create org, accept invite, membership admin).

### Security & access control, audit logs

OWASP insiste sur: “deny by default”, “validate permissions on every request”, “verify checks are performed in the right location”, et tester l’autorisation. citeturn6search0  
Sur ce point, votre design s’améliore car `InviteService.createInvite` valide l’autorisation au niveau core (pas uniquement dans la route).

**Audit logs**  
Vous avez un modèle DB `OrgAuditLog` (`schema.prisma`) et un service `logOrgAudit()` appelé dans routes create/invite/accept/switch (`apps/web/src/server/services/org-audit.service.ts`, routes org). C’est entièrement aligné avec OWASP Logging qui recommande de loguer notamment les **authorization failures** et événements de sécurité pertinents. citeturn7search0

**Angle mort**: les actions “role changed / member removed / ownership transferred” sont prévues dans les types d’audit (`OrgAuditAction`), mais comme les routes correspondantes ne semblent pas exposées, ces logs ne seront jamais émis en prod.

### DX/abstractions (ports/adapters/interfaces)

- `org-core` dépend seulement de `@contracts` (bonne discipline), et les accès DB passent via ports (`packages/org-core/src/org.ports.ts`).
- Mais les ports déclarent `tx?: any` plutôt que `DbTx` typé; ça fait perdre de la sécurité de type et peut masquer des bugs d’intégration. Recommandation: generic type paramétré `TxRunner<TTx>` + ports `tx?: TTx`.
- L’`InviteToken` est propre: génération + hashing injectés, et l’adapter utilise `randomBytes(...).toString("base64url")` (excellent). Toutefois, l’adapter dépend de `hashToken` (auth-core) et d’un secret env `TOKEN_PEPPER`: la gouvernance (rotation, minimum) est dans `env` (hors périmètre org-core → mais important).

### Tests (unit, intégration, races, e2e)

**Présent**: tests unitaires vitest dans org-core:
- `org.service.test.ts` vérifie org + subscription + active org.
- `invite.service.test.ts` couvre denial inviter non admin/owner, clamp TTL, accept invite, etc.
- `membership.service.test.ts` couvre forbidden, last owner, admin limitations, transfert ownership.

**Manquant** (important pour “prod-ready”):
- tests d’intégration DB (Prisma + Postgres) pour prouver les propriétés “unique + upsert + updateMany conditionnel” sous concurrence réelle,
- tests de race (2 acceptations simultanées, 2 changements de rôles en conflit),
- tests E2E routes (create org → invite → accept → switch → listing members).

### CI/CD & release readiness

Le monorepo a des scripts `turbo lint/typecheck/test/build` (`package.json`, `turbo.json`) et `@org-core` a `test: vitest run` (`packages/org-core/package.json`), donc il est exécutable en pipeline. Mais:
- Workflows GitHub Actions, scans (SAST/deps), changelog/release notes: **non spécifiés** (non trouvés/confirmables dans ce contexte).

## Tableau des manquants/risques et correctifs proposés

| Composant / fichier (path) | Problème précis | Impact (sécurité/UX/ops) | Priorité | Effort | Patch suggéré (snippet/pseudo) | Tests à ajouter |
|---|---|---|---|---|---|---|
| `creation__docs/prd.md`, `creation__docs/vision.md` | **Casing** différent de la consigne “PRD.md/Vision.md” → risque de scripts/docs brisés sur FS case-sensitive | ops/DX | P0 | Petit | Renommer vers `PRD.md` et `Vision.md` (ou dupliquer) + mettre à jour liens internes | Test CI “docs presence” (lint docs) |
| `apps/web/src/server/auth/require-user.ts`, `apps/web/src/app/api/org/switch/route.ts` | “Active org” stockée sur **User** → switch affecte toutes sessions; PRD/Vision parlent “per session/user context” (ambigu) | UX/produit | P1 | Moyen/Important | Option: ajouter `activeOrganizationId` à `Session` et faire switch “par session”; ou clarifier PRD: “par user (global)” | Intégration: 2 sessions simultanées changent org indépendamment (si option session) |
| `packages/auth-core/src/flows/signup.flow.ts` + adapter | Signup crée org+membership+sub mais ne set pas `activeOrganizationId` (1 update DB implicit plus tard via fallback) | ops/UX | P2 | Petit-Moyen | Ajouter `setActiveOrganization` au port `UsersRepo` auth-core OU appeler `prisma.user.update(activeOrganizationId)` côté route signup après tx | Test intégration: après signup, requireUser ne fait pas d’update correctif |
| `apps/web/src/app/api/org/invite/route.ts` | Email d’invite utilise `mail.sendVerifyEmail` (mauvaise sémantique/template) | UX | P0 | Petit | Ajouter `sendOrgInvite(email, acceptUrl, orgName, inviter)` dans email service; remplacer appel | E2E: invite génère email “invite” et non “verify” |
| `packages/org-core/src/invite.service.ts` | Accept invite non idempotent UX: 2e clic après acceptation → `invalid_invite` (car `findValidByTokenHash` filtre `acceptedAt`) | UX | P2 | Moyen | Option: ajouter `acceptedByUserId` à `Invitation` + accepter idempotent si même user; ou au moins permettre redirect “already accepted” dans route | Race test: double accept → 1 accepted, 1 already_accepted |
| `apps/web/src/app/(app)/dashboard/team/*` | UI Team n’expose pas admin actions (role change/remove/transfer), alors que core le supporte | UX/produit | P1 | Moyen | Ajouter routes: `/api/org/members/role`, `/api/org/members/remove`, `/api/org/ownership/transfer` consommant `MembershipService.*` + UI actions | E2E: owner change role; admin remove member; last owner protection |
| `apps/web/src/server/services/org-audit.service.ts` + routes à créer | Audit actions existe (`OrgAuditAction`) mais actions admin non loguées (routes manquantes) | ops/sécurité | P1 | Petit-Moyen | Dans nouvelles routes admin, appeler `logOrgAudit` avec outcome success/forbidden/error | Intégration: log row créée sur role change/remove/transfer |
| `packages/org-core/src/org.ports.ts` | Ports utilisent `tx?: any` → perte de type-safety, risque d’erreurs silencieuses | DX/maintenabilité | P2 | Moyen | Introduire generics: `TxRunner<TTx>`, et `tx?: TTx` dans ports + adapter `DbTx` | Typecheck: compilation échoue si tx incorrect |
| `apps/web/src/app/api/org/switch/route.ts` | Switch org bypass `org-core` (Prisma direct) → duplication de logique (membership check) | ops/DX | P2 | Moyen | Ajouter `OrgContextService.switchActiveOrg(userId, orgId)` dans `org-core` (port UsersRepo + MembershipsRepo), et l’utiliser dans route | Unit service + E2E route |
| `packages/org-core/src/*.test.ts` | Couverture surtout unitaire; peu de preuves “DB-level” (unique constraints, updateMany atomic, races) | ops/fiabilité | P1 | Important | Ajouter suite tests intégration (Testcontainers Postgres) pour: invite accept concurrence, ensureMembership upsert, last owner, switch + membership | Intégration: 2 accepts simultanés; 2 role changes concurrent |
| `apps/web/src/app/api/billing/webhook/route.ts` | Webhooks: vous faites déjà signature+idempotence+ordering; mais rotation de secret Stripe (multi-secret 24h) non gérée | ops/sécurité | P2 | Petit | Support multi secrets: essayer `STRIPE_WEBHOOK_SECRET_ACTIVE` puis `..._LEGACY[]`. Stripe recommande rolling secrets et support multi secrets temporairement. citeturn6search1 | Test: webhook signé avec secret legacy accepté pendant période |
| CI/CD (repo) | Workflows GH Actions, scans deps/SAST, changelog: **non spécifié** | ops/supply-chain | P2 | Moyen | Ajouter Actions: `pnpm lint typecheck test`, scans deps (OSV), CodeQL; changelog (Changesets) | CI gate PR + release pipeline |

## Diagrammes de flux critiques

```mermaid
flowchart TD
  subgraph CreateOrg_Invite_Accept_RoleAssign
    A[POST /api/org/create] --> B[OrgService.createOrg (tx)]
    B --> C[organization.create]
    C --> D[membership.create role=owner]
    D --> E[subscription.upsert plan=free status=inactive]
    E --> F[users.setActiveOrganization]
    F --> G[Org created]

    G --> H[POST /api/org/invite]
    H --> I[InviteService.createInvite]
    I --> J[check inviter role owner/admin]
    J --> K[randomToken + hashToken]
    K --> L[invitations.create tokenHash unique + expiresAt]
    L --> M[Email: accept URL]

    M --> N[GET /api/org/invite/accept?token=...]
    N --> O[InviteService.acceptInvite (tx)]
    O --> P[invitation.findValidByTokenHash acceptedAt=null expiresAt>now]
    P --> Q[user.email matches invite.email]
    Q --> R[memberships.ensureMembership upsert]
    R --> S[invitations.markAcceptedIfPending]
    S --> T[users.setActiveOrganization]
    T --> U[Redirect /dashboard/team?invite=accepted]

    U --> V[Role assign/remove/transfer]
    V --> W[MembershipService.changeMemberRole/removeMember/transferOwnership (tx)]
  end
```

```mermaid
flowchart TD
  subgraph Subscription_Create_Webhook_Revoke
    A[Org created] --> B[subscription.upsert free/inactive]
    C[Stripe Checkout] --> D[Stripe emits webhook events]
    D --> E[POST /api/billing/webhook]
    E --> F[Verify Stripe signature on raw body]
    F --> G[Insert billingWebhookEvent (unique eventId) -> dedupe]
    G --> H[Ordering guard via billingSubscriptionCursor]
    H --> I[SubscriptionSyncService.syncFromProviderSubscription]
    I --> J[subscriptions.upsert plan/status/currentPeriodEnd]
    K[Stripe subscription deleted] --> E
    E --> L[SubscriptionSyncService.markCanceled]
    L --> M[subscriptions.upsert status=canceled]
    M --> N[App gating: revoke features on cancel]
  end
```

Stripe insiste sur la vérification de signature sur le **raw body**, la tolérance anti-replay, la nécessité de répondre **rapidement 2xx**, et le fait que les retries génèrent une nouvelle signature/timestamp. citeturn6search1

## Checklist minimale priorisée pour prod et exemples de tests

### Checklist priorisée

**P0**
- Normaliser le casing et les références docs (`creation__docs/PRD.md`, `creation__docs/Vision.md`) pour éviter de casser l’automatisation.
- Corriger l’e-mail d’invite (ne pas utiliser `sendVerifyEmail` pour une invite org).
- S’assurer que toutes les routes sensibles (invite, switch, futurs endpoints admin) loguent les outcomes (success/forbidden/error). OWASP recommande un logging cohérent et notamment des échecs d’autorisation. citeturn7search0

**P1**
- Exposer (routes + UI) les actions d’admin d’équipe déjà présentes dans `MembershipService` (role change, remove, transfer) et loguer via `OrgAuditLog`.
- Ajouter tests d’intégration DB + tests de course/race pour invitations et admin actions.
- Expliciter dans PRD/Vision si “org active” est **par user** (global) ou **par session** (isolé), et aligner l’implémentation.

**P2**
- Optimiser signup: set `activeOrganizationId` dès la création (réduit n+1 et write correctif au premier `requireUser()`).
- Factoriser `switch org` dans un service `org-core` (réduit duplication et drift).
- Support multi webhook secrets Stripe pour rotations plus fluides. citeturn6search1
- Améliorer idempotence UX “accept invite” (optionnel selon votre UX cible).

### Exemples de tests à ajouter

**Unit (org-core)**
- `InviteService.acceptInvite`: cas `markAcceptedIfPending=false` (invite déjà acceptée) → comportement attendu (soit erreur, soit idempotent).
- `MembershipService`: tests supplémentaires sur admin vs owner (admin ne peut pas demote owner, etc.) – vous en avez déjà une partie.

**Intégration DB (Prisma + Postgres test)**
- Double accept simultané du même token: `Promise.all([accept(), accept()])` → 1 accepted, 1 “already accepted/invalid” mais **pas de 500**.
- Contrainte `Invitation.tokenHash @unique`: création de 2 invites identiques (forcer collision) doit échouer proprement.
- “last owner” sur données réelles: tenter de remove/demote dernier owner doit être bloqué.

**Race conditions**
- Deux owners qui font `transferOwnership` en parallèle (ou owner + admin actions) → vérifier invariants finaux (au moins un owner présent).
- Switch org pendant removal membership → `requireUser` doit retomber sur fallback membership sans loop/500.

**E2E (routes Next)**
- create org → invite → accept → switch org → page team montre bons membres et l’org active.
- endpoints admin (une fois ajoutés) → role change/removal/transfer + audit log row créé.

## CI/CD & release readiness

- `pnpm test` exécute `turbo test`, et `@org-core` a un script `test` (vitest), donc l’outillage interne est prêt pour la CI (`package.json`, `turbo.json`, `packages/org-core/package.json`).
- Scans sécurité, SAST/dep-check, changelog/release notes: **non spécifiés**. En pratique, pour vendre un “starter kit production-grade”, je considérerais au minimum:
  - pipeline GitHub Actions (lint/typecheck/test),
  - scan deps (OSV/Dependabot),
  - et une stratégie de release (Changesets ou changelog manuel).

OWASP rappelle que des défauts d’autorisation et des manques de logging/test sont des causes fréquentes d’incidents; votre base est bonne, mais la preuve “prod” vient surtout des tests d’intégration et des contrôles systématiques. citeturn6search0turn7search0