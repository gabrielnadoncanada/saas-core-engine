import { prisma } from "@db";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/server/auth/require-user";
import { withApiTelemetry } from "@/server/telemetry/otel";

const bodySchema = z.object({
  firstName: z.string().trim().max(80).optional().or(z.literal("")),
  lastName: z.string().trim().max(80).optional().or(z.literal("")),
  avatarUrl: z
    .string()
    .trim()
    .max(500)
    .url()
    .optional()
    .or(z.literal("")),
  phoneNumber: z
    .string()
    .trim()
    .max(32)
    .regex(/^[0-9+\-().\s]{0,32}$/)
    .optional()
    .or(z.literal("")),
});

export async function POST(req: Request) {
  return withApiTelemetry(req, "/api/auth/profile", async () => {
    const sessionUser = await requireUser();
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
    }

    const data = parsed.data;
    const normalized = {
      firstName: data.firstName?.trim() ? data.firstName.trim() : null,
      lastName: data.lastName?.trim() ? data.lastName.trim() : null,
      avatarUrl: data.avatarUrl?.trim() ? data.avatarUrl.trim() : null,
      phoneNumber: data.phoneNumber?.trim() ? data.phoneNumber.trim() : null,
    };

    const updated = await prisma.user.updateMany({
      where: { id: sessionUser.userId, deletedAt: null },
      data: normalized,
    });
    if (updated.count === 0) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ ok: true, profile: normalized });
  });
}
