-- V2 foundations: advanced RBAC, advanced org audit, secure impersonation

ALTER TABLE "org_audit_logs"
  ADD COLUMN "target" JSONB,
  ADD COLUMN "diff" JSONB,
  ADD COLUMN "ip" TEXT,
  ADD COLUMN "user_agent" TEXT,
  ADD COLUMN "trace_id" TEXT;

CREATE INDEX "org_audit_logs_action_created_at_idx"
  ON "org_audit_logs"("action", "created_at");

CREATE INDEX "org_audit_logs_outcome_created_at_idx"
  ON "org_audit_logs"("outcome", "created_at");

CREATE INDEX "org_audit_logs_trace_id_idx"
  ON "org_audit_logs"("trace_id");

CREATE TABLE "roles" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "created_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "roles_organization_id_key_key" ON "roles"("organization_id", "key");
CREATE INDEX "roles_organization_id_idx" ON "roles"("organization_id");

CREATE TABLE "permissions" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "condition" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "permissions_action_resource_key" ON "permissions"("action", "resource");

CREATE TABLE "role_permissions" (
  "role_id" TEXT NOT NULL,
  "permission_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id", "permission_id")
);

CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");

CREATE TABLE "membership_roles" (
  "membership_id" TEXT NOT NULL,
  "role_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "membership_roles_pkey" PRIMARY KEY ("membership_id", "role_id")
);

CREATE INDEX "membership_roles_role_id_idx" ON "membership_roles"("role_id");

CREATE TABLE "impersonation_sessions" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "actor_user_id" TEXT NOT NULL,
  "target_user_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "actor_ip" TEXT,
  "actor_user_agent" TEXT,
  "trace_id" TEXT,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ended_at" TIMESTAMP(3),
  "end_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "impersonation_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "impersonation_sessions_token_hash_key" ON "impersonation_sessions"("token_hash");
CREATE INDEX "impersonation_sessions_organization_id_started_at_idx"
  ON "impersonation_sessions"("organization_id", "started_at");
CREATE INDEX "impersonation_sessions_actor_user_id_ended_at_idx"
  ON "impersonation_sessions"("actor_user_id", "ended_at");
CREATE INDEX "impersonation_sessions_target_user_id_ended_at_idx"
  ON "impersonation_sessions"("target_user_id", "ended_at");

ALTER TABLE "role_permissions"
  ADD CONSTRAINT "role_permissions_role_id_fkey"
  FOREIGN KEY ("role_id") REFERENCES "roles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "role_permissions"
  ADD CONSTRAINT "role_permissions_permission_id_fkey"
  FOREIGN KEY ("permission_id") REFERENCES "permissions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "membership_roles"
  ADD CONSTRAINT "membership_roles_membership_id_fkey"
  FOREIGN KEY ("membership_id") REFERENCES "memberships"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "membership_roles"
  ADD CONSTRAINT "membership_roles_role_id_fkey"
  FOREIGN KEY ("role_id") REFERENCES "roles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
