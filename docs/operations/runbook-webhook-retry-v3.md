# Runbook Webhook Retry V3

## Objectif

Garantir la reprise des webhooks Stripe en echec.

## Mode nominal

1. `/api/billing/webhook` valide la signature.
2. Event stocke (`billing_webhook_events`).
3. Traitement direct de l'event (sans queue/worker).

## Replay manuel

1. Lister les echec (`status=failed`).
2. Rejouer: `pnpm webhook:replay`
3. Verifier retour `status=processed`.

## Idempotence

`event_id` est unique; les duplicates ne retraitent pas la logique metier.
