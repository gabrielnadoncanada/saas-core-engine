# Runbook AI Budget V3

## Objectif

Controler les depenses AI par organisation et appliquer le hard-stop.

## Sources

1. `AI_POLICY` (budget plan par defaut)
2. `ai_budgets` (override org)
3. `ai_usage` (consommation mensuelle)

## Procedure

1. Ouvrir dashboard AI Usage.
2. Verifier `costUsd` vs `monthlyBudgetUsd`.
3. Si depassement:
- requests AI bloquees (402)
- ajuster budget org via endpoint budget si necessaire

## Alertes

Declencher alerte quand `usagePct` depasse `alertThresholdPct`.
