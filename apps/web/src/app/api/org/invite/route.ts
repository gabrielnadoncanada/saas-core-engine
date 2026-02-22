import { orgInviteBodySchema } from "@contracts";
import { prisma } from "@db";
import { NextResponse } from "next/server";

import { createInviteService } from "@/server/adapters/core/org-core.adapter";
import { orgErrorResponse } from "@/server/auth/org-error-response";
import { withRequiredOrgScope } from "@/server/auth/with-org-scope";
import {
  getOrCreateRequestId,
  withRequestId,
} from "@/server/http/request-context";
import { logError, logInfo, logWarn } from "@/server/logging/logger";
import { getEmailService } from "@/server/services/email.service";
import { absoluteUrl } from "@/server/services/url.service";
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
            try {
              const mail = getEmailService();
              await mail.sendOrgInvite(email, acceptUrl, organization?.name ?? undefined);
            } catch (emailError) {
              logWarn("org.invite.email_delivery_failed", {
                requestId,
                organizationId: orgCtx.organizationId,
                actorUserId: orgCtx.userId,
                email: email.toLowerCase(),
                acceptUrl,
                error:
                  emailError instanceof Error
                    ? { name: emailError.name, message: emailError.message }
                    : { message: "unknown_error" },
                ...getActiveTraceContext(),
              });
              throw emailError;
            }

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

