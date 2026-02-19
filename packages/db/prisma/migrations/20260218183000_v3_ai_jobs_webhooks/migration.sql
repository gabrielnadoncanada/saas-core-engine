-- V3 foundations: AI budget governance + async webhook retry metadata

CREATE TABLE "ai_budgets" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "monthlyBudgetUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "alert_threshold_pct" INTEGER NOT NULL DEFAULT 80,
  "hard_stop_enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_budgets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_budgets_organizationId_key" ON "ai_budgets"("organizationId");
CREATE INDEX "ai_budgets_organizationId_idx" ON "ai_budgets"("organizationId");

ALTER TABLE "billing_webhook_events"
  ADD COLUMN "payload" JSONB,
  ADD COLUMN "delivery_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "last_attempt_at" TIMESTAMP(3);
