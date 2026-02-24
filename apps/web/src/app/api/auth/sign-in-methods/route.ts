import { prisma } from "@db";
import { NextResponse } from "next/server";

import { requireUser } from "@/server/auth/require-user";
import {
  enabledOAuthProviders,
  type SignInMethod,
} from "@/server/auth/sign-in-methods";
import { env } from "@/server/config/env";
import { withApiTelemetry } from "@/server/telemetry/otel";

export async function GET(req: Request) {
  return withApiTelemetry(req, "/api/auth/sign-in-methods", async () => {
    const sessionUser = await requireUser();
    const user = await prisma.user.findFirst({
      where: { id: sessionUser.userId, deletedAt: null },
      select: {
        email: true,
        passwordHash: true,
        oauthAccounts: {
          select: {
            provider: true,
            email: true,
            lastUsedAt: true,
            providerAccountId: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const methods: SignInMethod[] = [];
    const connectedCount =
      (user.passwordHash ? 1 : 0) + user.oauthAccounts.length;

    if (env.AUTH_SIGNIN_EMAIL_ENABLED) {
      methods.push({
        provider: "email",
        label: "Email",
        connected: Boolean(user.passwordHash),
        linkedIdentifier: user.email,
        action: "manage",
        canDisconnect: connectedCount > 1,
      });
    }

    for (const provider of enabledOAuthProviders()) {
      const account = user.oauthAccounts.find((row) => row.provider === provider);
      methods.push({
        provider,
        label: provider === "google" ? "Google" : "GitHub",
        connected: Boolean(account),
        linkedIdentifier:
          account?.email ??
          (account ? `${provider}:${account.providerAccountId}` : undefined),
        lastUsedAt: account?.lastUsedAt?.toISOString(),
        action: account ? "disconnect" : "connect",
        canDisconnect: account ? connectedCount > 1 : false,
      });
    }

    return NextResponse.json({
      ok: true,
      methods,
    });
  });
}
