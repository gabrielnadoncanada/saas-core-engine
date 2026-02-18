import { NextResponse } from "next/server";
import { orgInviteBodySchema } from "@contracts";
import { prisma } from "@db";
import { OrgCoreError } from "@org-core";
import { orgErrorResponse } from "@/server/auth/org-error-response";
import { withRequiredOrgScope } from "@/server/auth/with-org-scope";
import { getEmailService } from "@/server/services/email.service";
import { absoluteUrl } from "@/server/services/url.service";
import { createInviteService } from "@/server/adapters/core/org-core.adapter";
import { logOrgAudit } from "@/server/services/org-audit.service";
import {
  getOrCreateRequestId,
  withRequestId,
} from "@/server/http/request-context";
import {
  enforceOrgActionRateLimit,
  isOrgActionRateLimitError,
} from "@/server/rate-limit/org-action-rate-limit";
import { logError, logInfo, logWarn } from "@/server/logging/logger";
import { getActiveTraceContext, withApiTelemetry } from "@/server/telemetry/otel";

export async function POST(req: Request) {
  return withApiTelemetry(req, "/api/org/invite", async () => {
    const requestId = getOrCreateRequestId(req);
    const withContext = <T extends Response>(res: T) =>
      withRequestId(res, requestId);
    try {
      return await withRequiredOrgScope({
        action: "org:invite:create",
        run: async (orgCtx) => {
          const parsed = orgInviteBodySchema.safeParse(await req.json());
          if (!parsed.success) {
            logWarn("org.invite.invalid_input", {
              requestId,
              organizationId: orgCtx.organizationId,
              actorUserId: orgCtx.userId,
              ...getActiveTraceContext(),
            });
            return withContext(
              NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 }),
            );
          }

          const email = parsed.data.email;
          const role = parsed.data.role;

          try {
            await enforceOrgActionRateLimit(req, {
              action: "org.invite.create",
              organizationId: orgCtx.organizationId,
              actorUserId: orgCtx.userId,
              targetEmail: email,
            });
          } catch (error) {
            if (!isOrgActionRateLimitError(error)) throw error;

            await logOrgAudit({
              organizationId: orgCtx.organizationId,
              actorUserId: orgCtx.userId,
              action: "org.invite.created",
              targetType: "email",
              targetId: email.toLowerCase(),
              outcome: "forbidden",
              metadata: {
                role,
                reason: "rate_limited",
                requestId,
                ...getActiveTraceContext(),
              },
            });

            logWarn("org_invite_rate_limited_total", {
              requestId,
              organizationId: orgCtx.organizationId,
              actorUserId: orgCtx.userId,
              email: email.toLowerCase(),
              ...getActiveTraceContext(),
            });

            return withContext(
              NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 }),
            );
          }

          try {
            const invites = createInviteService();
            const issued = await invites.createInvite({
              organizationId: orgCtx.organizationId,
              inviterUserId: orgCtx.userId,
              email,
              role,
              ttlMinutes: 60 * 24 * 3,
            });

            const acceptUrl = absoluteUrl(
              `/api/org/invite/accept?token=${encodeURIComponent(issued.token)}`,
            );
            const organization = await prisma.organization.findUnique({
              where: { id: orgCtx.organizationId },
              select: { name: true },
            });
            const mail = getEmailService();
            await mail.sendOrgInvite(email, acceptUrl, organization?.name ?? undefined);

            await logOrgAudit({
              organizationId: orgCtx.organizationId,
              actorUserId: orgCtx.userId,
              action: "org.invite.created",
              targetType: "email",
              targetId: email.toLowerCase(),
              metadata: { role, requestId, ...getActiveTraceContext() },
            });

            logInfo("org.invite.created", {
              requestId,
              organizationId: orgCtx.organizationId,
              actorUserId: orgCtx.userId,
              email: email.toLowerCase(),
              role,
              ...getActiveTraceContext(),
            });

            return withContext(NextResponse.json({ ok: true }));
          } catch (error) {
            await logOrgAudit({
              organizationId: orgCtx.organizationId,
              actorUserId: orgCtx.userId,
              action: "org.invite.created",
              targetType: "email",
              targetId: email.toLowerCase(),
              outcome:
                error instanceof OrgCoreError && error.code === "forbidden"
                  ? "forbidden"
                  : "error",
              metadata: { role, requestId, ...getActiveTraceContext() },
            });

            logError("org.invite.failed", {
              requestId,
              organizationId: orgCtx.organizationId,
              actorUserId: orgCtx.userId,
              email: email.toLowerCase(),
              role,
              ...getActiveTraceContext(),
              error:
                error instanceof Error
                  ? { name: error.name, message: error.message }
                  : { message: "unknown_error" },
            });

            return withContext(orgErrorResponse(error));
          }
        },
      });
    } catch (error) {
      return withContext(orgErrorResponse(error));
    }
  });
}
