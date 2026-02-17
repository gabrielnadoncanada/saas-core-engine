# Audit production-ready du package `packages/auth-core` dans `gabrielnadoncanada/saas-core-engine`

## Résumé exécutif

Le package `@auth-core` est **proche** d’un niveau production-ready sur les fondamentaux (Argon2id avec paramètres alignés OWASP, tokens hachés en DB et “single-use” via update conditionnel, sessions hachées avec rotation + idle timeout, OAuth Google avec PKCE S256 + `state` haché + validation de `nonce` dans l’ID token). Toutefois il manque encore quelques composantes qui, en production, finissent par générer **des incidents** (DoS par mot de passe trop long, absence de *rehash policy*, politique de “pepper” trop permissive, surfaces d’erreurs incohérentes, anti-énumération par timing non traitée, hooks de rate-limit non standardisés au niveau du core, et couverture de tests surtout unitaires sans intégration DB/race conditions). Verdict: **prod-ready = non** à ce stade, surtout par **risque de disponibilité (DoS)** et **dette sécu/ops** (upgrade des hashes, gouvernance des secrets, observabilité réellement branchée). Les correctifs proposés ci-dessous sont actionnables et majoritairement “petit/moyen” en effort. Les recommandations s’appuient sur OWASP, RFC 7636 (PKCE), RFC 6749 (`state`), OIDC Core (`nonce`) et la doc Node (encodage base64url, `timingSafeEqual`). citeturn4search0turn11search4turn3search0turn7search0turn7search3turn6search0turn3search4

**État global (prod-ready)**: **non**

**Score de maturité (0–100)**: **78 / 100**

Critères (pondération implicite):
- Crypto & stockage de secrets: **bon**, mais manque rehash + politique pepper stricte + contrôle DoS (≈ 18/25) citeturn4search0turn11search3turn10search5  
- Tokens & anti-replay: **très bon** (≈ 14/15) citeturn11search4  
- OAuth/OIDC: **très bon** (≈ 14/15) citeturn3search0turn7search0turn7search3  
- Sessions: **très bon** (rotation + idle timeout), mais dépend du “cookie layer” (non spécifié) (≈ 14/15) citeturn11search0  
- Anti-enumeration & rate limit: **bon**, mais timing + hooks core à solidifier (≈ 8/12) citeturn11search3turn11search4  
- Errors & observability: **moyen**, car pas homogène (≈ 6/10) citeturn11search3  
- Tests & CI/CD: **moyen** (tests unitaires solides; CI/scans non spécifiés) (≈ 4/8)

## Méthodologie et périmètre analysé

### Étapes effectuées

Lecture et audit du dépôt via le connecteur GitHub (lecture directe des fichiers). L’accès web direct aux fichiers du dépôt n’était pas exploitable via l’outil web (dépôt non indexé/privé); j’ai donc basé tous les constats “code” sur les contenus extraits du dépôt (extraits verbatim + chemins exacts). Les recommandations “standards” sont sourcées via RFC/OWASP/Node.

### Fichiers lus (sélection principale)

`packages/auth-core`:
- `src/hashing/password.ts`, `src/hashing/token.ts`, `src/hashing/random.ts`
- `src/oauth/pkce.ts`, `src/oauth/state.service.ts`, `src/oauth/providers/google.ts`
- `src/email-tokens/email-token.service.ts`
- `src/sessions/session.service.ts`
- `src/flows/*.ts` (signup, login, magic-login, password-reset, verify-email, oauth-login)
- `src/errors.ts`, `src/events.ts`, `src/auth.ports.ts`, `src/index.ts`
- Tests: `src/**/*.test.ts`

Couplage DB/app nécessaire pour juger la “prod readiness”:
- `packages/db/prisma/schema.prisma`, `packages/db/src/tx.ts`
- `apps/web/src/server/db-repos/*.ts` (email tokens, sessions, oauth states, oauth accounts, users)
- `apps/web/src/app/api/auth/oauth/google/*/route.ts`
- `apps/web/src/server/auth/auth-rate-limit.ts`
- `apps/web/src/server/adapters/core/auth-core.adapter.ts`

### Heuristiques utilisées

Comparaison systématique du design observé vs exigences “production-grade” issues des standards (OWASP + RFC) : stockage des mots de passe, anti-énumération, single-use tokens, PKCE S256, `state` non-devinable, `nonce` OIDC, rotation/expiration des sessions, et primitives Node recommandées (base64url, constant-time compare). citeturn4search0turn11search3turn11search4turn3search0turn7search0turn7search3turn3search4turn6search0

## Constats par dimension

**Sécurité cryptographique (Argon2id, paramètres, rehash, DoS):**  
Vous utilisez Argon2id avec `memoryCost: 19456`, `timeCost: 2`, `parallelism: 1` (`packages/auth-core/src/hashing/password.ts`), ce qui correspond exactement à une configuration recommandée par OWASP (Argon2id 19 MiB / 2 itérations / p=1). citeturn4search0  
Manque critique: pas de **limite max** de taille de mot de passe avant hashing → OWASP note que certains hashers peuvent être vulnérables à un DoS avec des mots de passe très longs; vous devez donc borner l’entrée de manière explicite. citeturn11search3  
Manque important: pas de **rehash policy**. Or le module `argon2` expose `needsRehash(digest, options)` (types). citeturn10search5

**Gestion des tokens (hashing, TTL, single-use, contraintes DB):**  
Le pattern est sain: tokens bruts générés, **hachés** via `hashToken(token, pepper)` puis stockés, et consommation “single-use” via `updateMany(where usedAt:null…)` dans `apps/web/src/server/db-repos/email-tokens.repo.ts`. Ça respecte les attentes OWASP “random”, “stored securely”, “single use”, “expire”. citeturn11search4  
Point à durcir: `TOKEN_PEPPER` n’exige que `length >= 16` (`packages/auth-core/src/hashing/token.ts`). Ce garde-fou est trop permissif et facilite une mauvaise configuration (pepper faible) → durcir la règle (exigence minimale + format). (Recommandation, pas une exigence RFC.)  

**OAuth/OIDC (PKCE, state, nonce, linking):**  
PKCE S256 est correctement implémenté et même testé via le vecteur RFC 7636 (`pkce.test.ts`). citeturn3search0  
Le `state` est aléatoire, haché, stocké en DB, puis “consommé” (delete) — conforme à l’objectif CSRF décrit dans RFC 6749 (state non-devinable, lié au user-agent). citeturn7search0  
OIDC `nonce` est envoyé au provider, et validé dans `GoogleProvider.exchangeCode()`; OIDC exige que le client valide l’égalité du `nonce` si présent. citeturn7search3  
Linking: `OAuthLoginFlow.linkOrCreate` refuse email manquant/non vérifié (bon).  

**Sessions (création, rotation, listing, last_seen, revokeAll):**  
Votre SessionService fait ce qu’on veut voir: token aléatoire, stockage DB d’un **hash**, validation avec idle timeout optionnel, mise à jour `lastSeenAt` throttled, rotation transactionnelle (si `TxRunner`). Ça s’aligne avec OWASP qui recommande notamment la régénération/renouvellement de session après changement de privilège (ex: auth). citeturn11search0  
Gaps: (1) L’interface contract `SessionSummary` côté `packages/contracts/src/auth.ts` **n’expose pas `lastSeenAt`** alors que la DB et les ports l’ont — ce qui bloque l’exigence “session listing avec last_seen_at”. (2) Les attributs de cookies (HttpOnly/SameSite/Secure) sont **non spécifiés** (par contrainte utilisateur).  

**Anti-enumeration & rate limiting:**  
Les flows Login/Forgot utilisent une réponse générique (ok false / ok true) et évitent de distinguer “user absent vs mauvais mot de passe” au niveau réponse — conforme à OWASP. citeturn11search3turn11search4  
Cependant OWASP souligne aussi la **discrépance par timing**: le “quick exit” (retour immédiat si user absent) peut permettre de déduire l’existence d’un compte. Votre `LoginFlow` retourne immédiatement si user absent, sans “padding” computationnel. citeturn11search3  
Rate limiting existe côté app DB (`AuthRateLimitBucket`) mais le core n’expose pas de **contrat de clés/erreurs** standard (exigence utilisateur).  

**Errors & observability:**  
Le core possède déjà `AuthCoreError` + `authErr` (`packages/auth-core/src/errors.ts`) et un modèle d’événements `AuthEvent` (`packages/auth-core/src/events.ts`). Mais l’usage est hétérogène: `OAuthLoginFlow` lance `authErr("unauthorized", ...)`, tandis que d’autres flows renvoient `{ ok:false }` ou lancent `Error` (signup “Email already in use”). OWASP recommande des réponses génériques côté client, mais ça n’empêche pas d’avoir des erreurs typées côté domaine pour le mapping (et logging) serveur. citeturn11search3  
Autre point: `auth.login.failed` log l’email en clair via event; si vous branchez l’emitter sur un SIEM/observabilité, ça peut devenir un enjeu PII (à hacher).  

**DX/abstractions:**  
Vous avez déjà des repos + `TxRunner` (bien). Il manque cependant les abstractions explicitement demandées: `Clock`, `Crypto`, `EmailSender`, `OAuthProvider` (au sens “port”), etc. À court terme ce n’est pas bloquant, mais ça rend plus difficile: tests déterministes, portage edge/node, et standardisation des intégrations.

**Tests:**  
Très bonne couverture **unitaire** (hashing, PKCE RFC vector, sessions, email token consume concurrent, flows). Mais il manque des tests **d’intégration DB** (ex: réellement tester l’unicité `token_hash`, la transaction Prisma, et les races en parallèle au niveau DB), et des tests end-to-end pour les routes (notamment OAuth callback).  

**CI/CD & release:**  
Le package `@auth-core` expose scripts `lint/typecheck/test/build` (`packages/auth-core/package.json`). L’existence de workflows CI, scans sécurité, dépendabot, release notes/changelog est **non spécifiée** (non observée via l’exploration disponible).

## Tableau des manquants et risques priorisés

> Convention effort: **petit** (≤ 0,5–1 j), **moyen** (2–5 j), **important** (≥ 1–2 sem, implique infra/CI/DB/tests).  
> “Patch suggéré”: pseudo-diff ou snippet; à adapter à votre style.

| Composant / fichier (path) | Problème précis | Impact (sécurité/UX/ops) | Priorité | Effort | Patch suggéré (snippet/pseudo) | Tests à ajouter |
|---|---|---:|:--:|:--:|---|---|
| `packages/auth-core/src/hashing/password.ts` | **Pas de limite max** de taille du mot de passe avant Argon2 → risque DoS (input énorme) | sécurité/ops | **P0** | Petit | `const MAX=1024; if (new TextEncoder().encode(plain).length>MAX) throw new Error("Password too long");` (ou DomainError) | Test: password 2–10 MB → rejette rapidement |
| `packages/auth-core/src/hashing/password.ts` + `packages/auth-core/src/flows/login.flow.ts` | **Pas de rehash policy** (upgrade params Argon2) | sécurité/ops | **P1** | Moyen | Utiliser `argon2.needsRehash(hash,{timeCost,memoryCost,parallelism})` puis rehash au login réussi et `users.setPasswordHash`. `needsRehash` est exposé par le module `argon2`. citeturn10search5turn4search0 | Tests: (1) mock `needsRehash=true` → `setPasswordHash` appelé; (2) `needsRehash=false` → pas de rehash |
| `packages/auth-core/src/flows/login.flow.ts` | Anti-enumeration **par timing** non traité: “quick exit” si user absent | sécurité | **P1** | Moyen | Pattern OWASP: toujours faire un `verifyPassword` sur un hash dummy (pré-calculé) quand user absent, puis retourner `{ok:false}`. OWASP décrit ce problème de “processing time discrepancy”. citeturn11search3 | Test: user absent appelle `verifyPassword(dummyHash, pw)`; (optionnel) bench micro pour éviter régression |
| `packages/auth-core/src/hashing/token.ts` | `TOKEN_PEPPER` exigé seulement `len>=16` + hash = `sha256(token:pepper)` (non HMAC) | sécurité | **P1** | Petit | Monter le minimum (ex: ≥32 chars) + option: passer à HMAC-SHA256 (node:crypto + `timingSafeEqual` si comparaison). `timingSafeEqual` est l’outil standard constant-time. citeturn6search0 | Tests: pepper trop court → throw; hash déterministe; (si HMAC) vecteurs fixes |
| `packages/auth-core/src/hashing/random.ts` + `packages/auth-core/src/oauth/pkce.ts` | Encodage base64url via `btoa` (global legacy) + boucle “binary string”; Node recommande `Buffer`/`base64url` | ops/DX | **P2** | Petit | Remplacer par `Buffer.from(bytes).toString("base64url")` (Node supporte `base64url`) et éviter `btoa`. citeturn3search4turn8search3 | Test: tokens/challenge restent conformes; PKCE RFC vector doit continuer de passer citeturn3search0 |
| `packages/auth-core/src/flows/signup.flow.ts` | `throw new Error("Email already in use")` (pas DomainError + peut faciliter enum si réponse non masquée) | UX/sécurité | **P2** | Petit | Remplacer par `throw authErr("email_in_use", ...)` et **dans la route** rendre message générique si vous voulez anti-enum stricte. OWASP note que l’inscription doit être considérée aussi. citeturn11search3 | Tests: attend `AuthCoreError.code==="email_in_use"` |
| `packages/auth-core/src/flows/verify-email.flow.ts` | Confirm non transactionnel: token consommé puis update user (panne DB → token brûlé) | UX/ops | **P2** | Moyen | Injecter `TxRunner` + faire `tokens.consume(..., tx)` puis `users.markEmailVerified(..., tx)` dans un `withTx`. | Test: si `markEmailVerified` throw → tx rollback (avec repo mock “tx-aware”) |
| `packages/contracts/src/auth.ts` | `SessionSummary` n’inclut pas `lastSeenAt` alors que DB + ports l’ont | UX | **P1** | Petit | Ajouter `lastSeenAt: Date | null` à `SessionSummary` + l’exposer dans endpoint “sessions list” | Test typecheck + test route (si existant) |
| `packages/auth-core/src/events.ts` | Events OK, mais `auth.login.failed` inclut email en clair (PII) | ops (privacy) | **P2** | Petit | Remplacer `email` par `emailHash` (HMAC) ou ajouter champ et déprécier l’ancien | Tests: event payload shape; hashing stable |
| `apps/web/src/server/adapters/core/auth-core.adapter.ts` | L’emitter d’événements est **no-op** → observabilité réelle manquante | ops | **P2** | Petit | Injecter un `AuthEventEmitter` branché (logger/metrics). (Impl outbox si vous voulez “exactly-once”). | Test: emitter appelé sur login/token/session |
| `apps/web/src/server/auth/auth-rate-limit.ts` + `packages/auth-core` | Rate limit est dans l’app; le core n’expose pas “keys/errors” standardisés (exigence) | ops/DX | **P2** | Moyen | Ajouter dans `auth-core`: `AuthRateLimitRoute` + helper `buildAuthRateLimitKey({ip,route})`; normaliser erreur `authErr("rate_limited", ...)` (nécessite étendre `AuthErrorCode`). OWASP recommande limiter brute-force + éviter enum à grande échelle. citeturn11search3 | Tests: clé stable; mapping 429 |
| `packages/auth-core` (global) | Tests d’intégration DB/race non présents (Prisma transaction, contraintes `@unique`) | ops/sécurité | **P2** | Important | Ajouter tests intégration (Testcontainers Postgres ou DB de test) pour: unique `token_hash`, consume concurrent réel, rotation session en tx | Tests: 2 consumes en parallèle → 1 success, 1 null; rollback tx |
| CI/CD (repo) | Workflows CI, scans deps, SAST, release notes: **non spécifié** | ops/supply-chain | **P2** | Moyen | GitHub Actions: lint/typecheck/test, `pnpm audit`/OSV scanner, CodeQL. (Non spécifié actuellement) | “CI gate” sur PR + baseline vuln scan |

## Flux critiques

```mermaid
flowchart TD
  subgraph Signup_Verify_Login
    A[POST signup] --> B[SignupFlow.execute]
    B --> C[tx: users.create + orgs.create + memberships.create + subs.upsert]
    C --> D[POST verify-email/request]
    D --> E[VerifyEmailFlow.request -> EmailTokenService.issue]
    E --> F[EmailSender: lien verify-email/confirm?token=...]
    F --> G[GET verify-email/confirm]
    G --> H[VerifyEmailFlow.confirm -> EmailTokenService.consume]
    H --> I[users.markEmailVerified]
    I --> J[POST login]
    J --> K[LoginFlow.execute -> verifyPassword -> touchLastLogin]
    K --> L[SessionService.createSession + set cookie]
  end

  subgraph Magic_Link
    M1[POST magic/request] --> M2[MagicLoginFlow.request -> EmailTokenService.issue]
    M2 --> M3[EmailSender: lien magic/confirm?token=...]
    M3 --> M4[GET magic/confirm]
    M4 --> M5[MagicLoginFlow.confirm (tx)]
    M5 --> M6[EmailTokenService.consume (markUsedIfUnused)]
    M6 --> M7[users.findById or users.create]
    M7 --> M8[users.markEmailVerified + touchLastLogin]
    M8 --> M9[SessionService.createSession + set cookie]
  end

  subgraph Reset_Password
    R1[POST password/forgot] --> R2[PasswordResetFlow.request]
    R2 --> R3{user existe?}
    R3 -->|non| R4[return ok true (anti-enum)]
    R3 -->|oui| R5[EmailTokenService.issue password_reset]
    R5 --> R6[EmailSender: lien reset?token=...]
    R6 --> R7[POST password/reset]
    R7 --> R8[PasswordResetFlow.reset (tx)]
    R8 --> R9[EmailTokenService.consume]
    R9 --> R10[users.setPasswordHash]
    R10 --> R11[sessions.revokeAllForUser]
  end

  subgraph OAuth_Google
    O1[GET oauth/google/start] --> O2[OAuthStateService.create (stateHash + codeVerifier)]
    O2 --> O3[redirect Google: state + PKCE S256 + nonce]
    O3 --> O4[GET oauth/google/callback code+state]
    O4 --> O5[OAuthStateService.consume (deleteByIdIfExists)]
    O5 --> O6[GoogleProvider.exchangeCode + jwtVerify + nonce check]
    O6 --> O7[OAuthLoginFlow.linkOrCreate]
    O7 --> O8[SessionService.createSession + set cookie]
    O8 --> O9[redirect consumed.redirectUri]
  end
```

## Checklist minimale pour passer en prod et mapping d’erreurs HTTP

### Checklist minimale priorisée

**P0**
- Ajouter max length sur mot de passe avant Argon2 (anti-DoS). citeturn11search3  
- Durcir la politique `TOKEN_PEPPER` (min réaliste + doc de rotation).  
- Assurer que les routes (app) ne renvoient jamais de token brut (magic/reset) au client (le core retourne des tokens pour l’EmailSender; côté API la réponse doit rester générique). (Comportement côté routes: à valider localement.)

**P1**
- Implémenter *rehash policy* via `argon2.needsRehash` (upgrade automatique). citeturn10search5turn4search0  
- Traiter l’anti-enumeration par timing sur login (dummy verify). citeturn11search3  
- Exposer `lastSeenAt` dans `SessionSummary` (contrats).  
- Harmoniser erreurs: utiliser `AuthCoreError` partout (ou retourner `{ok:false,errorCode}` safe).

**P2**
- Moderniser l’encodage base64url (Buffer `base64url`) dans `random.ts` et `pkce.ts` (éviter btoa legacy). citeturn3search4turn8search3  
- Brancher un vrai `AuthEventEmitter` (logging/audit/metrics) et réduire PII (hash email).  
- Standardiser des hooks “rate limit” au niveau core + ajouter un code `rate_limited` et mapping 429. citeturn11search3  
- Ajouter tests d’intégration DB/race + CI scans (non spécifié actuellement).

### Exemples d’erreurs typées et mapping HTTP

Codes disponibles actuellement (`packages/contracts/src/auth.ts`):  
`invalid_credentials`, `email_in_use`, `invalid_token`, `expired_token`, `unauthorized`.

Recommandation de mapping (API web):
- `invalid_credentials` → **401** (toujours générique, même si user absent) citeturn11search3  
- `email_in_use` → **409** (ou 200 générique selon anti-enum) citeturn11search3  
- `invalid_token` → **400** (ou 200 générique pour certains flows)  
- `expired_token` → **410**  
- `unauthorized` → **401**  
- *(à ajouter)* `rate_limited` → **429** (aligné sur rate limiting OWASP + pratique web)

Exemple concret côté route handler (pseudo):

```ts
import { AuthCoreError } from "@auth-core";

function mapAuthError(e: unknown) {
  if (!(e instanceof AuthCoreError)) return { status: 500, body: { ok: false } };

  switch (e.code) {
    case "invalid_credentials": return { status: 401, body: { ok: false } };
    case "email_in_use":        return { status: 409, body: { ok: false } };
    case "invalid_token":       return { status: 400, body: { ok: false } };
    case "expired_token":       return { status: 410, body: { ok: false } };
    case "unauthorized":        return { status: 401, body: { ok: false } };
    default:                    return { status: 400, body: { ok: false } };
  }
}
```

### Notes standards (à garder comme garde-fous)

- PKCE S256: formule et obligation d’utiliser S256 si disponible. citeturn3search0  
- `state`: doit contenir une valeur non-devinable et être liée à l’état du user-agent pour CSRF (OAuth2). citeturn7search0  
- `nonce` OIDC: si envoyé, le client doit vérifier l’égalité dans l’ID token. citeturn7search3  
- Comparaison constant-time (si vous comparez des secrets en mémoire): `crypto.timingSafeEqual`. citeturn6search0