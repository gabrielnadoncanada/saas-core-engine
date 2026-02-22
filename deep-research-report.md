# Audit V1 commercialisable à 149 USD — gabrielnadoncanada/saas-core-engine

## 🚨 EXECUTIVE SUMMARY

**Peut-on vendre maintenant ?** **Non.**  
Le repo a une base technique solide (séparation “core” vs “adapter web”, hashing de tokens avec pepper, rate-limiting DB, PKCE Google bien fait), mais il est **trop ambitieux** pour un V1 “lean” et surtout **pas fiable sur Billing** tel qu’implémenté aujourd’hui (webhooks Stripe + traitement asynchrone via queue). Le PRD exige un V1 “strict” concentré sur auth/org/billing + DX + sécurité. fileciteturn63file3

**Main blockers (bloqueurs de prod ET de vente)**  
Le traitement Stripe est **couplé à une queue + worker + Redis**, ce qui casse le “deploy <15 minutes” et augmente drastiquement le support (infrastructure additionnelle), tout en introduisant des risques de panne. Le endpoint webhook tente de **mettre en file** chaque event. fileciteturn91file0  
L’architecture V1 est **encombrée** par des briques V2/V3 (AI, RBAC custom, audit, impersonation, runbooks incident), ce qui augmente le risque d’erreurs, la charge cognitive et le coût de support pour un produit à 149 USD. fileciteturn110file4turn103file12turn103file7turn91file6  
La doc “folder-structure” est **désalignée** avec la réalité du repo (ex: présence de modules AI/jobs/rbac, structure différente), ce qui tue la DX et contredit les attentes PRD “one-click deploy guide / docs complete”. fileciteturn109file0

**Top 3 actions pour débloquer du revenu rapidement**  
1) **Simplifier Billing à un webhook synchrone et idempotent** (sans queue/worker/Redis) + valider le pipeline complet Checkout → Webhook → DB (statut subscription). C’est le cœur “vendable”. fileciteturn63file3turn91file0  
2) **Couper agressivement tout ce qui dépasse le V1 PRD** (AI, jobs, impersonation, RBAC custom, audit “enterprise-ish”, pages dashboard non requises) pour revenir à un starter “clean”. fileciteturn63file3turn110file4turn103file12turn103file7  
3) **Verrouiller le parcours “clone → setup → demo → deploy”** (scripts, env validation, docs deploy réellement actionnables, licence commerciale, onboarding acheteur). fileciteturn63file3turn91file3

## Audit architecture et production-readiness

### Structure vs PRD

Le PRD impose un monorepo avec apps/web et des packages “contracts/db/auth-core/org-core/billing-core/ui/email”, avec un graphe de dépendances strict et aucun import circulaire. fileciteturn63file3  
Le repo respecte **partiellement** l’intention (core isolé + adapters Next), mais diverge sur le périmètre : présence de **packages supplémentaires** (AI, jobs, rbac) et d’un **apps/worker** qui introduit de la complexité infra non-V1. fileciteturn110file4turn93file0

### Violations structurelles

Le worker importe du code interne de `apps/web` via des imports relatifs. C’est une **violation directe** du principe “apps/web comme adapter” et crée un couplage “app-to-app” difficile à maintenir et à vendre comme starter “production-grade”. fileciteturn93file0  
La création d’org + subscription est implémentée dans `SignupFlow` (auth-core), ce qui brouille les frontières “auth vs org vs billing” et rend le core moins composable (risque de fuite de responsabilités). fileciteturn63file3

### Sur‑ingénierie (à couper pour V1)

Le endpoint d’invitation org est surchargé : RBAC “scopes”, request-id, telemetry, audit logs, rate limiting spécifique org action, queue email, fallback email, logging enrichi, etc. Pour un V1 à 149 USD, c’est trop de surface et trop de points de panne/support. fileciteturn106file5  
La stratégie “queue + worker + dead letter + runbook retry v3” dépasse le PRD V1 (le PRD parle d’idempotency webhooks, pas d’un système de jobs/incident simulation complet). fileciteturn93file0turn91file6turn63file3

### Sous‑ingénierie / risques production

Le cookie de session dépend d’options d’env (Secure/SameSite). C’est correct comme approche, mais **haut risque** si les defaults sont mauvais en prod. OWASP recommande Secure + HttpOnly + SameSite comme protections importantes. fileciteturn55file2 citeturn18search0  
L’extraction IP pour rate limiting dépend d’un flag `TRUST_PROXY_HEADERS`; si mal configuré derrière un proxy/CDN, vous pouvez soit rater le rate limiting, soit rate-limit tous les users sur une IP unique. fileciteturn78file2

## Matrice de couverture vs PRD

Le PRD V1 “strict” est la source d’autorité pour ce tableau. fileciteturn63file3

| Feature (PRD) | Implemented | Partial | Missing | Overbuilt | Should be removed |
|---|---:|---:|---:|---:|---:|
| Email/password login | ✅ |  |  |  |  |
| Magic link login | ✅ |  |  |  |  |
| Forgot + reset password (anti‑enum) | ✅ |  |  |  |  |
| Email verification | ✅ |  |  |  |  |
| OAuth Google (PKCE + state + nonce) | ✅ |  |  |  |  |
| OAuth GitHub (PKCE) |  | ✅ |  |  |  |
| Account linking OAuth + email | ✅ |  |  |  |  |
| Sessions list + revoke | ✅ |  |  |  |  |
| Cookie HttpOnly/Secure/SameSite | ✅ |  |  |  |  |
| Rate limiting auth endpoints | ✅ |  |  |  |  |
| Anti‑enumeration responses | ✅ |  |  |  |  |
| Multi‑org membership | ✅ |  |  |  |  |
| Active org (user-level, global) | ✅ |  |  |  |  |
| Default org created at signup | ✅ |  |  |  |  |
| Create org / switch org endpoints | ✅ |  |  |  |  |
| Invite members + accept flow | ✅ |  |  |  |  |
| Roles fixed owner/admin/member |  | ✅ |  | ✅ | ✅ |
| Org isolation enforced server-side | ✅ |  |  |  |  |
| Stripe checkout subscription |  | ✅ |  |  |  |
| Customer portal |  | ✅ |  |  |  |
| Webhook signature verification | ✅ |  |  |  |  |
| Webhook sync → Subscription DB |  | ✅ |  | ✅ |  |
| Webhook idempotency | ✅ |  |  |  |  |
| Support minimum Stripe events list (PRD) |  | ✅ |  |  |  |
| Dashboard pages exact set (PRD) |  | ✅ |  | ✅ | ✅ |
| Seed demo data |  | ✅ |  |  |  |
| Env validation (Zod) |  | ✅ |  |  |  |
| Stripe CLI dev mode documented | ✅ |  |  |  |  |
| One-click deploy guide verified |  |  | ✅ |  |  |
| Strict ESLint + Prettier | ✅ |  |  |  |  |

Notes critiques sur la matrice  
Les rôles “fixes” PRD sont contredits par l’ajout d’un rôle `super_admin` et par des tables RBAC custom (roles/permissions/assignments). C’est “overbuilt” pour V1. fileciteturn63file3  
La couche dashboard contient des pages et features AI/RBAC/users qui dépassent le set PRD requis. fileciteturn103file7turn103file4turn103file14  
Billing est le plus dangereux : signature OK, idempotency en partie OK, mais le workflow “queue” rend Billing fragile et non “deploy <15 min”. fileciteturn91file0turn93file0

## Security audit

### Checklist demandée (PRD) vs implémentation

Le PRD exige Argon2id, tokens hashés uniquement, TTL courts, PKCE + state, cookie flags stricts, rate limiting, anti‑enumeration, signature Stripe, idempotency webhooks. fileciteturn63file3

**Argon2id utilisé ?**  
Les tests de login utilisent explicitement `argon2.argon2id` et valident l’upgrade des paramètres (rehash) — bon signal de maturité. fileciteturn63file4  
⚠️ Je n’ai pas validé directement le contenu de `hashPassword()` (fichier sensible), mais l’ensemble du design + tests pointent fortement vers Argon2id.

**Tokens hashés ?**  
Les tokens/identifiants sont hashés via HMAC-SHA256 + pepper (`TOKEN_PEPPER` min 32 chars) — bon. fileciteturn78file2  
Les tables DB stockent `tokenHash` (sessions/email_tokens/invitations), pas le token brut — bon. fileciteturn66file4

**Rate limiting réel ou théorique ?**  
C’est **réel** : `enforceAuthRateLimit()` upsert un bucket en DB + lance “rate_limited” au-delà du seuil. fileciteturn78file2  
Risque: si headers proxy sont mal gérés, IP = 127.0.0.1 pour tous, donc rate limiting destructeur. fileciteturn78file2

**OAuth PKCE correct ?**  
Google OAuth start : génère state + code_verifier, calcule S256 code_challenge, passe state + code_challenge_method=S256 + nonce, et rate-limit l’endpoint. fileciteturn84file0  
Google callback : consomme state (delete), échange code avec code_verifier, vérifie nonce sur ID token, crée session. fileciteturn85file0  
Le calcul S256 correspond au standard PKCE (BASE64URL(SHA256(verifier))). citeturn18search6turn18search5

⚠️ Point de vigilance : le `codeVerifier` est stocké en clair dans la DB (table oauth_states). Si la DB est compromise, vous augmentez l’impact potentiel (même si l’attaquant aurait encore besoin d’un code OAuth valide). fileciteturn66file4

**Stripe webhook signature vérifiée ?**  
Oui : utilisation de `stripe.webhooks.constructEvent(body, signature, secret)` et rejet HTTP 400 si invalide. fileciteturn91file0

**Idempotency safe ?**  
Le stockage DB a `eventId` unique et `createReceived()` gère la collision via erreur unique (P2002 → duplicate). fileciteturn91file0  
⚠️ Mais le pipeline actuel “store event → queue → processing → orchestrator.begin(createReceived)” semble introduire un double-enregistrement “duplicate” qui peut court-circuiter le traitement (risque fonctionnel majeur → “billing sync silencieusement cassé”). fileciteturn91file0

**Anti‑enumeration enforced ?**  
LoginFlow fait une vérif dummy hash quand user inexistant (réduit differences timing / erreur) et retourne toujours `{ ok: false }` — conforme OWASP (messages génériques). fileciteturn63file4 citeturn18search2

**Cookie flags correct ?**  
Le cookie session est `httpOnly: true`, `secure: env.SESSION_COOKIE_SECURE`, `sameSite: env.SESSION_COOKIE_SAME_SITE`, `path: "/"`. fileciteturn55file2  
OWASP recommande HttpOnly + Secure + SameSite pour protéger les cookies de session. citeturn18search0  
⚠️ Mais la conformité dépend 100% des valeurs default d’env (non auditées ici).

### Vulnérabilités / risques concrets (liste claire)

Le webhook Stripe dépend d’une queue : si `QUEUE_ENABLED=false` ou Redis down, le handler renvoie 500 après échec d’enqueue. Stripe va retry, mais vous allez accumuler des échecs + statuts incohérents → support nightmare. fileciteturn91file0turn93file0  
Pipeline webhook probablement cassé par double `createReceived()` entre route et orchestrator begin (risque “aucun sync subscription en prod”). fileciteturn91file0  
Stockage en clair de `codeVerifier` dans OAuth state (DB). C’est un “hardening gap”. fileciteturn66file4  
Surface d’attaque inutilement grande (AI endpoints/pages, impersonation, RBAC custom, audit logs, telemetry). Plus de code = plus de vulnérabilités potentielles et plus de patching. fileciteturn110file4turn103file12turn103file7

## 🧹 REMOVE FOR V1

Le PRD V1 est “lean mais complet sur les fondamentaux”. Tout ce qui augmente la surface/infra/support sans augmenter directement la valeur perçue “auth+org+billing” doit sortir. fileciteturn63file3

### Modules à supprimer (exact paths)

**Supprimer l’infra Jobs/Queue/Worker (gros gain DX + deploy <15 min)**  
Supprimer `apps/worker/**` (worker BullMQ + dead-letter), et tout le couplage associé. fileciteturn93file0  
Supprimer `packages/jobs-core/**` (BullMQ), et les appels queue côté web (`apps/web/src/server/jobs/**`). fileciteturn93file0turn93file0  
Modifier `apps/web/src/app/api/billing/webhook/route.ts` pour **traiter synchrone** (ou fallback synchrone) au lieu d’enqueue. fileciteturn91file0  
**Temps sauvé estimé**: 3–6 jours + énorme réduction des tickets “Redis/worker”.

**Supprimer AI pack (non essentiel pour 149 USD V1 “starter kit”)**  
Supprimer pages dashboard AI (`apps/web/src/app/(app)/dashboard/ai-*`) et endpoints API AI si présents. fileciteturn103file5turn103file7turn103file9  
Nettoyer `packages/contracts` exports AI si inutiles en V1. fileciteturn66file0  
**Temps sauvé estimé**: 2–4 jours + réduction des risques légaux/couts (OpenAI keys, quotas).

**Supprimer impersonation + audit logs “enterprise-ish”**  
Supprimer endpoints `apps/web/src/app/api/org/impersonation/**` + services associés. fileciteturn103file12  
Supprimer `packages/org-core/src/impersonation.service.ts` + utilisation dans require-user/cookies. fileciteturn93file0  
Alléger `require-user.ts` (retirer impersonation state) et `session-cookie.adapter.ts` (cookie _imp). fileciteturn55file2  
**Temps sauvé estimé**: 1–3 jours + baisse du risque “support/security”.

**Supprimer RBAC custom + pages admin inutiles**  
Supprimer `packages/rbac-core/**` et les tables RBAC custom si non utilisées en V1. fileciteturn103file4turn66file4  
Supprimer les pages `/dashboard/roles`, `/dashboard/users` et autres admin panels non listés dans le PRD. fileciteturn103file4turn103file14  
**Temps sauvé estimé**: 2–4 jours.

### Risque si on ne coupe pas

Si vous gardez queue/worker + AI/RBAC/impersonation, vous vendez un produit “starter kit $149” qui exige (implicitement) Redis, un worker séparé, un pipeline d’observabilité, et une surface de code digne d’un “platform framework”. Le support va exploser, et la promesse PRD “deploy <15 min” devient mensongère. fileciteturn63file3turn91file0turn93file0

## 🛠 MISSING FOR V1

### Critical missing (fonctionnel)

Billing V1 n’est pas “safe” tant que :  
Le webhook ne peut pas survivre sans Redis/queue, ce qui viole l’objectif de déploiement simple. fileciteturn91file0turn93file0  
Le flux complet checkout → webhook → DB doit être validé sur un DB vierge (seed + migrations) avec un Stripe test-mode réel (ou Stripe CLI). fileciteturn63file3turn91file3

### Security gaps (à corriger avant vente)

Hardening OAuth : éviter de stocker `codeVerifier` en clair (au minimum chiffrer au repos ou dériver autrement), ou documenter explicitement la menace acceptée. fileciteturn66file4  
CSRF : avec des cookies HttpOnly, SameSite aide mais n’est pas une garantie “universelle” pour tous scénarios; PRD mentionne “CSRF-safe flows” (Vision aussi). Vous devez au minimum documenter et appliquer une stratégie (Origin/Referer checks sur POST sensibles ou token CSRF). fileciteturn63file3turn63file1turn55file2 citeturn18search0  
Réduire surface d’attaque en supprimant AI/impersonation/extra admin.

### Billing gaps (PRD)

Le PRD liste des events Stripe additionnels (invoice.payment_succeeded/failed). Ils sont acceptés mais non exploités (aucune logique). Soit vous les retirez explicitement du scope V1, soit vous implémentez un minimum (ex: marquer past_due/unpaid). fileciteturn63file3turn91file0

### Org isolation gaps

Org isolation est bien appliquée via lookup membership et requireOrgContext, mais la couche d’invitation est sur‑complexe (RBAC scopes + audit + telemetry). Pour V1, il manque une version minimaliste et facile à comprendre. fileciteturn106file5turn103file3

### Missing commercialization checklist (PRD)

Le PRD exige avant vente : demo live, docs complètes, vidéo walkthrough, deploy 10 minutes vérifié, licence prête. fileciteturn63file3  
Constats :  
Le “Deploy page” est un guide partiel, pas un “one-click deploy” éprouvé (pas de bouton, pas de check-list exhaustive). fileciteturn91file3  
Il n’y a pas de **LICENSE** à la racine; une page `/license` existe mais ce n’est pas une licence de distribution standard et c’est insuffisant pour vendre (Gumroad/LemonSqueezy exigent du clair). fileciteturn110file1turn110file0  
“Setup tested from zero” n’est pas prouvé par CI (pas d’évidence ici). fileciteturn63file3

## 🗺 30-DAY SHIPPING ROADMAP

Objectif : fastest path to revenue + low support burden + valeur perçue max, sans ajouter du scope.

### Semaine 1

Stabiliser le noyau V1 (scope cut + billing fix)  
Couper queue/worker: supprimer `apps/worker`, `packages/jobs-core`, et retirer tout “QUEUE_ENABLED/Redis required” du chemin critique. fileciteturn93file0turn91file0  
Refactor `POST /api/billing/webhook`: traiter sync + idempotent (unique eventId). Garder signature verification. fileciteturn91file0  
Fixer le traitement webhook pour éviter double `createReceived()` (un seul endroit). fileciteturn91file0  
Couper AI/impersonation/RBAC custom (code + routes + pages). fileciteturn110file4turn103file12turn103file7  
Mettre le schéma DB au strict PRD (au minimum roles owner/admin/member + tables PRD, sans AI/RBAC/impersonation). fileciteturn63file3turn66file4

### Semaine 2

Rendre les flows V1 impeccables (auth + org)  
Valider auth endpoints PRD (signup/login/logout, magic request/confirm, forgot/reset, verify email request/confirm, sessions list/revoke). fileciteturn63file3  
Vérifier anti-enumeration et rate limiting sur endpoints auth sensibles. fileciteturn78file2turn63file4 citeturn18search2  
Simplifier org invite endpoint à la version V1 (sans telemetry/audit/rbac scopes) tout en gardant org isolation. fileciteturn106file5turn103file3  
Assurer que l’accept invite flow mène à une UX claire (au minimum redirect vers dashboard). fileciteturn63file3

### Semaine 3

DX + docs + deploy réel “<15 minutes”  
Mettre une doc “Deploy in 10 minutes” réellement exécutable (Vercel + Postgres + Stripe webhook + OAuth callbacks) avec étapes exactes + check-list. fileciteturn63file3turn91file3  
Rendre le setup depuis zéro infaillible: `pnpm setup` + `pnpm dev` + seed demo + migrations propres. fileciteturn63file3  
Ajouter un **LICENSE commercial clair** à la racine (pas juste une page UI). fileciteturn63file3turn110file0  
Nettoyer la doc “folder-structure” pour matcher le repo réel. fileciteturn109file0

### Semaine 4

Polish “sellable” (qualité, sécurité, packaging)  
Audit sécurité final: cookies flags conformes OWASP, stratégie CSRF documentée/appliquée, endpoints auth protégés, pas d’extras dangereux. citeturn18search0turn18search2  
Déployer une demo live avec un dataset demo, et vérifier les flows end-to-end (auth/org/billing). fileciteturn63file3  
Préparer onboarding acheteur: README persuasif + “quickstart” + FAQ + modes (demo vs prod) + common pitfalls. fileciteturn63file3  
Enregistrer le walkthrough 10 minutes (PRD). fileciteturn63file3

## 🎯 MINIMAL SELLABLE CORE DEFINITION

Le produit à 149 USD doit inclure **exactement** (et rien de plus) :

Auth V1  
Email/password + login (anti-enumeration, Argon2id). fileciteturn63file4  
Magic link (TTL < 20 min). fileciteturn66file3  
Reset password (TTL < 20 min + revoke sessions). fileciteturn66file3  
Email verification. fileciteturn66file3  
OAuth Google + GitHub avec PKCE + state. fileciteturn84file0  
Sessions: list + revoke + revoke all. fileciteturn63file3  
Rate limiting auth endpoints (DB buckets). fileciteturn78file2  
Cookies session HttpOnly + Secure + SameSite (valeurs prod sûres). fileciteturn55file2 citeturn18search0

Org / Multi-tenant V1  
User multi-org membership. fileciteturn63file3  
Active org persistant par user. fileciteturn63file3  
Create org / switch org. fileciteturn101file0  
Invite + accept invite (roles owner/admin/member uniquement). fileciteturn63file3turn106file5  
Org isolation enforced server-side. fileciteturn103file3

Billing V1 (Stripe)  
Free + Pro monthly via Checkout. fileciteturn63file3  
Customer portal. fileciteturn63file3  
Webhooks: signature verification + idempotency + sync vers table subscription. fileciteturn91file0  
Zéro dépendance à Redis/worker pour fonctionner.

Dashboard/UI V1 (pages PRD)  
/login /signup /verify-email /forgot-password /reset-password /onboarding /dashboard /dashboard/billing /dashboard/team /dashboard/settings /dashboard/sessions. fileciteturn63file3  
ShadCN + Tailwind + responsive + toasts. fileciteturn63file3

DX / Commercialisation V1  
`pnpm setup` + demo seed. fileciteturn63file3  
Env validation (Zod) + docs env. fileciteturn63file3  
Guide deploy “10 minutes” vérifié. fileciteturn63file3turn91file3  
LICENSE commercial clair à la racine. fileciteturn63file3turn110file0

## Pricing justification check

Dans l’état actuel, **ce n’est pas crédible à 149 USD** pour “low support burden”, parce que :  
Le billing dépend d’une infra additionnelle (Redis + worker) qui n’est pas compatible avec la promesse “deploy <15 min” et qui va générer des tickets (webhooks en erreur, queue down, jobs stuck). fileciteturn91file0turn93file0  
Le scope V2/V3 (AI/RBAC/audit/impersonation) gonfle le repo, mais n’augmente pas la valeur perçue d’un “starter kit” — ça augmente surtout le risque et la maintenance. fileciteturn110file4turn103file12turn103file7  
La doc “folder-structure” désalignée avec le repo réel est un red flag immédiat pour un acheteur technique; ça nuit directement à la DX et à la confiance. fileciteturn109file0

**Ce qui doit être corrigé pour justifier 149 USD**  
Billing stable sans infra additionnelle, flows auth/org sans surprises, docs deploy reproductibles, et un scope minimal clair (pas d’AI pack “half-baked”). fileciteturn63file3turn91file3
