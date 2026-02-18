CREATE TABLE "org_action_rate_limit_buckets" (
  "id" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "window_start" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "org_action_rate_limit_buckets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "org_action_rate_limit_buckets_scope_window_start_key"
  ON "org_action_rate_limit_buckets"("scope", "window_start");

CREATE INDEX "org_action_rate_limit_buckets_scope_window_start_idx"
  ON "org_action_rate_limit_buckets"("scope", "window_start");
