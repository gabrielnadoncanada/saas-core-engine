import { prisma } from "../src/client";

async function main() {
  const demoEmail = "demo@example.com";

  const user = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: {
      email: demoEmail,
      // Placeholder hash (replace when auth-core hashing exists)
      passwordHash: "REPLACE_WITH_ARGON2ID_HASH",
      emailVerifiedAt: new Date(),
    },
  });

  const org = await prisma.organization.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: { name: "Demo Organization" },
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Demo Organization",
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_organizationId: { userId: user.id, organizationId: org.id },
    },
    update: { role: "owner" },
    create: { userId: user.id, organizationId: org.id, role: "owner" },
  });

  await prisma.subscription.upsert({
    where: { organizationId: org.id },
    update: { plan: "free", status: "inactive" },
    create: { organizationId: org.id, plan: "free", status: "inactive" },
  });

  // Cleanup expired tokens (dev convenience)
  await prisma.emailToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  await prisma.oAuthState.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  // eslint-disable-next-line no-console
  console.log("✅ Seed complete:", {
    demoEmail,
    orgId: org.id,
    userId: user.id,
  });
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
