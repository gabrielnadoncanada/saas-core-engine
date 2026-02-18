import { NextResponse } from "next/server";
import { prisma } from "@db";
import { getSessionUser } from "@/server/auth/require-user";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // ok | error | blocked | null
  const limit = Math.min(
    100,
    Math.max(10, Number(searchParams.get("limit") ?? 50)),
  );

  const rows = await prisma.aIAuditLog.findMany({
    where: { organizationId: user.organizationId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      toolExecutions: {
        orderBy: { step: "asc" },
        select: { step: true, toolName: true, durationMs: true, status: true, errorMessage: true },
      },
    },
  });

  // resolve user emails (small N)
  const userIds = Array.from(new Set(rows.map((r) => r.userId)));
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true },
  });
  const emailById = new Map(users.map((u) => [u.id, u.email] as const));

  return NextResponse.json({
    ok: true,
    rows: rows.map((r) => ({
      ...r,
      userEmail: emailById.get(r.userId) ?? r.userId.slice(0, 8) + "…",
    })),
  });
}
