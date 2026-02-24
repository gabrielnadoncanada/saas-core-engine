import { hashPassword } from "@auth-core";
import { prisma } from "@db";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/server/auth/require-user";
import { withApiTelemetry } from "@/server/telemetry/otel";

const PASSWORD_BLACKLIST = ["password", "123456", "qwerty", "letmein", "admin"];

const bodySchema = z
  .object({
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Password confirmation does not match.",
    path: ["confirmPassword"],
  })
  .refine(
    (value) => {
      const lowered = value.password.toLowerCase();
      return !PASSWORD_BLACKLIST.some((item) => lowered.includes(item));
    },
    {
      message: "Password is too weak.",
      path: ["password"],
    },
  );

export async function POST(req: Request) {
  return withApiTelemetry(req, "/api/auth/password/set", async () => {
    const sessionUser = await requireUser();
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { id: sessionUser.userId, deletedAt: null },
      select: { id: true, passwordHash: true },
    });
    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    if (user.passwordHash) {
      return NextResponse.json(
        { ok: false, error: "password_already_set" },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(parsed.data.password);
    await prisma.user.update({
      where: { id: sessionUser.userId },
      data: { passwordHash },
    });

    return NextResponse.json({ ok: true });
  });
}
