import { prisma } from "@db";
import { Prisma } from "@db";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/server/auth/require-user";
import { withApiTelemetry } from "@/server/telemetry/otel";

const bodySchema = z.object({
  email: z.string().trim().email().max(320),
});

export async function POST(req: Request) {
  return withApiTelemetry(req, "/api/auth/profile/email", async () => {
    const sessionUser = await requireUser();
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
    }

    const nextEmail = parsed.data.email.toLowerCase();
    const current = await prisma.user.findFirst({
      where: { id: sessionUser.userId, deletedAt: null },
      select: { email: true },
    });

    if (!current) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    if (current.email === nextEmail) {
      return NextResponse.json({ ok: true, email: current.email });
    }

    try {
      const updated = await prisma.user.updateMany({
        where: { id: sessionUser.userId, deletedAt: null },
        data: {
          email: nextEmail,
          emailVerifiedAt: null,
        },
      });
      if (updated.count === 0) {
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
      }
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return NextResponse.json({ ok: false, error: "email_in_use" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ ok: true, email: nextEmail });
  });
}
