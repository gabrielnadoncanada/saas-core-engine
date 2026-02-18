# Runbook RBAC V2

## Objectif

Restaurer rapidement les droits d'acces custom org (roles, permissions, membership_roles).

## Verification rapide

1. Verifier les endpoints:
- `GET /api/org/rbac/roles`
- `PUT /api/org/rbac/roles/:roleId/permissions`
- `PUT /api/org/rbac/memberships/:membershipId/roles`
2. Verifier les tables:
- `roles`
- `permissions`
- `role_permissions`
- `membership_roles`

## Incident courant: permission manquante

1. Ouvrir `Dashboard > Roles & Permissions`.
2. Verifier que la permission `action:resource` existe sur le role cible.
3. Verifier que le role est assigne au membership cible.
4. Rejouer l'action et confirmer la ligne dans `org_audit_logs` (`action=org.roles.updated`).

## Rollback

1. Retirer les roles custom du membership.
2. Replacer les permissions par la baseline.
3. Valider via un appel API en lecture seule avant remise en production.
