# Runbook Async Jobs V3

## Objectif

Operer les queues BullMQ (emails, billing-webhooks, dead-letter).

## Preconditions

1. Redis actif (`QUEUE_REDIS_URL`)
2. Worker demarre: `pnpm worker`

## Verification

1. Queue emails consomme `email.org_invite.send`
2. Queue billing-webhooks consomme `billing.webhook.process`
3. Dead-letter recoit les echecs max retry

## Actions incident

1. Worker down: redemarrer `pnpm worker`
2. Backlog croissant: verifier Redis + provider externe
3. Job poison: isoler via dead-letter, corriger payload, rejouer
