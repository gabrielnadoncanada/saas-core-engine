import { prisma } from "@db";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/server/auth/require-user";
import { withApiTelemetry } from "@/server/telemetry/otel";

const bodySchema = z.object({
  provider: z.enum(["google", "github"]),
});

export async function POST(req: Request) {
  return withApiTelemetry(req, "/api/auth/sign-in-methods/disconnect", async () => {
    const sessionUser = await requireUser();
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
    }

    const provider = parsed.data.provider;
    const user = await prisma.user.findFirst({
      where: { id: sessionUser.userId, deletedAt: null },
      select: {
        id: true,
        passwordHash: true,
        oauthAccounts: {
          select: {
            provider: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const connectedCount =
      (user.passwordHash ? 1 : 0) + user.oauthAccounts.length;
    const currentlyConnected = user.oauthAccounts.some(
      (account) => account.provider === provider,
    );

    if (!currentlyConnected) {
      return NextResponse.json({ ok: false, error: "not_connected" }, { status: 409 });
    }

    if (connectedCount <= 1) {
      return NextResponse.json(
        { ok: false, error: "must_add_another_method_first" },
        { status: 409 },
      );
    }

    await prisma.oAuthAccount.deleteMany({
      where: {
        userId: sessionUser.userId,
        provider,
      },
    });

    return NextResponse.json({ ok: true });
  });
}
