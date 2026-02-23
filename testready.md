# 🎯 MINIMAL FEATURE SET — PLATEFORME DOIT INCLURE

## 1️⃣ Authentification (production-grade)

Obligatoire :

- Email/password login
- Password hashing Argon2id
- Email verification flow
- Password reset sécurisé (token hashé en DB)
- Session sécurisée (httpOnly, secure, sameSite)
- Logout
- Protection des routes serveur
- Protection des routes client
- Anti-user enumeration (mêmes réponses login/reset)
- Rate limiting login/reset

Optionnel mais acceptable :

- OAuth (Google) — seulement si correctement sécurisé (PKCE)

À exclure :

- 2FA
- Magic links avancés
- SSO enterprise

---

## 2️⃣ Organisation / Multi-tenant

Obligatoire :

- User appartient à une organisation
- Table organizations
- Table memberships
- Role minimal : OWNER / MEMBER
- Middleware enforce orgId
- Isolation stricte par orgId
- Création automatique d’org à l’inscription
- Invitation membre par email
- Acceptation d’invitation sécurisée

À exclure :

- Multi-roles complexes
- Permissions granulaires avancées
- Teams dans teams

---

## 3️⃣ Billing Stripe

Obligatoire :

- Stripe checkout
- Webhook signature vérifiée
- Idempotency webhook
- Subscription status sync en DB
- Gestion état :
  - active
  - past_due
  - canceled

- Upgrade/downgrade plan
- Customer portal Stripe
- Middleware bloque features si subscription inactive

À exclure :

- Usage-based billing
- Credits system
- Multiple pricing tiers complexes

---

## 4️⃣ Dashboard

Obligatoire :

- Dashboard protégé
- Affichage info org
- Affichage plan
- Gestion membres
- Lien billing portal
- Settings account

Pas besoin :

- Analytics avancés
- Widgets inutiles
- Admin global panel

---

## 5️⃣ Sécurité minimale production

Obligatoire :

- Argon2id
- CSRF protection
- Rate limiting
- Headers sécurisés (helmet ou équivalent)
- Cookie flags corrects
- Validation Zod (ou équivalent)
- Sanitization input
- Stripe signature verification
- Token reset hashé
- Aucun secret exposé frontend

---

## 6️⃣ Dev Experience

Obligatoire :

- Setup < 15 min
- .env.example complet
- Script seed
- Script migrate
- Script dev
- Script build
- Script lint
- TypeScript strict
- README clair
- One-click deploy doc
- Stripe CLI doc

---

# 🧪 SUITE DE TESTS OBLIGATOIRE

On vise 4 niveaux :

- Unit tests
- Integration tests
- E2E tests
- Security tests

---

# 1️⃣ AUTH TESTS

## Unit

- Password hash utilise Argon2id
- Password verify fonctionne
- Reset token est hashé
- Token expire correctement
- Email normalization correcte

## Integration

- Signup crée user + org
- Login valide crée session
- Login invalide retourne erreur générique
- Reset flow complet fonctionne
- Email verification bloque login si non vérifié

## E2E (Playwright recommandé)

Scénarios :

1. Signup → verify email → login → dashboard
2. Mauvais password → erreur générique
3. Reset password → nouveau login OK
4. Logout invalide session

---

# 2️⃣ MULTI-TENANT TESTS

CRITIQUE.

## Unit

- orgId toujours requis dans services
- Service refuse requête sans orgId

## Integration

- User A (org A) ne peut pas accéder données org B
- Invitation crée membership pending
- Accept invitation associe bon org
- Owner peut supprimer member
- Member ne peut pas supprimer owner

## E2E

- 2 comptes distincts
- Création donnée org A
- Vérifier org B ne voit rien

---

# 3️⃣ BILLING TESTS

## Unit

- Webhook verify signature
- Idempotency key empêche double traitement

## Integration

- Checkout crée session Stripe
- Webhook active subscription
- Cancel webhook met statut canceled
- Middleware bloque accès si inactive

## E2E

- Simuler stripe CLI
- Achat plan
- Accès feature premium débloqué
- Annulation → feature bloquée

---

# 4️⃣ SECURITY TESTS

Tests automatisés :

- Tentative brute force → rate limit
- Tentative enumeration email → réponse générique
- Cookie httpOnly présent
- Cookie secure en prod
- No secret in client bundle
- CSRF token requis pour POST

Tests manuels :

- Injection SQL
- Injection XSS
- Manipulation orgId via API

---

---

# 📋 CHECKLIST CONFORMITÉ V1

Si une seule case échoue → non vendable.

Auth

- [ ] Argon2id
- [ ] Reset sécurisé
- [ ] Anti enumeration
- [ ] Rate limit

Org

- [ ] Isolation garantie
- [ ] Role minimal
- [ ] Middleware org

Billing

- [ ] Webhook sécurisé
- [ ] Sync DB fiable
- [ ] Feature gating réel

Security

- [ ] Cookies secure
- [ ] CSRF actif
- [ ] Validation stricte
- [ ] No secret leak

DX

- [ ] Setup < 15 min
- [ ] Docs claires
- [ ] Scripts cohérents
- [ ] Seed data

---

# 🚨 Si tu veux une V1 vraiment “parfaite”

Ajoute ces tests bloquants :

- CI pipeline avec :
  - lint
  - typecheck
  - tests
  - build

- 90% coverage sur auth + billing + org
- Webhook replay test
- Test double subscription protection

---

# 💰 Est-ce que ça vaut 149$ ?

Oui SI :

- Setup frictionless
- Sécurité béton
- Billing solide
- Multi-tenant réellement isolé
- Code propre, compréhensible
- Pas d’overengineering

Non SI :

- Webhook fragile
- Isolation douteuse
- Setup pénible
- Docs incomplètes
- Trop de features inutiles
