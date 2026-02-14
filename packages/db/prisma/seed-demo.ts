import { PrismaClient } from "@prisma/client";
import { hashPassword } from "@auth-core";

const prisma = new PrismaClient();

async function main() {
  // Wipe minimal demo tables (careful in real prod)
  await prisma.session.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await hashPassword("DemoPassw0rd!");

  const owner = await prisma.user.create({
    data: { email: "demo@saastemplate.dev", passwordHash },
  });

  const member = await prisma.user.create({
    data: { email: "teammate@saastemplate.dev", passwordHash },
  });

  const org = await prisma.organization.create({
    data: { name: "Demo Workspace" },
  });

  await prisma.membership.createMany({
    data: [
      { userId: owner.id, organizationId: org.id, role: "owner" },
      { userId: member.id, organizationId: org.id, role: "member" },
    ],
  });

  await prisma.subscription.create({
    data: {
      organizationId: org.id,
      plan: "pro",
      status: "active",
      stripeCustomerId: "cus_demo",
      stripeSubscriptionId: "sub_demo",
      currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 19),
    },
  });

  // Fake sessions
  const now = Date.now();
  await prisma.session.createMany({
    data: [
      {
        userId: owner.id,
        tokenHash: "demo_hash_1",
        createdAt: new Date(now - 1000 * 60 * 60 * 24 * 3),
        expiresAt: new Date(now + 1000 * 60 * 60 * 24 * 27),
        userAgent: "Chrome on macOS",
        ip: "203.0.113.10",
      },
      {
        userId: owner.id,
        tokenHash: "demo_hash_2",
        createdAt: new Date(now - 1000 * 60 * 60 * 6),
        expiresAt: new Date(now + 1000 * 60 * 60 * 24 * 29),
        userAgent: "Safari on iOS",
        ip: "203.0.113.11",
      },
    ],
  });

  console.log("✅ Demo seed complete");
  console.log("Login: demo@saastemplate.dev / DemoPassw0rd!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
