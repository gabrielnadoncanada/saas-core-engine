import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../../auth-core/src/index";

const databaseUrl = process.env["DATABASE_URL"];

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run seed-demo.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

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
    data: {
      email: "demo@saastemplate.dev",
      passwordHash,
      emailVerifiedAt: new Date(),
    },
  });

  const member = await prisma.user.create({
    data: { email: "teammate@saastemplate.dev", passwordHash },
  });

  const primaryOrg = await prisma.organization.create({
    data: { name: "Demo Workspace" },
  });

  const secondaryOrg = await prisma.organization.create({
    data: { name: "Client Sandbox" },
  });

  await prisma.membership.createMany({
    data: [
      { userId: owner.id, organizationId: primaryOrg.id, role: "owner" },
      { userId: owner.id, organizationId: secondaryOrg.id, role: "admin" },
      { userId: member.id, organizationId: primaryOrg.id, role: "member" },
    ],
  });

  await prisma.user.update({
    where: { id: owner.id },
    data: { activeOrganizationId: primaryOrg.id },
  });

  await prisma.subscription.create({
    data: {
      organizationId: primaryOrg.id,
      plan: "pro",
      status: "active",
      providerCustomerId: "cus_demo",
      providerSubscriptionId: "sub_demo",
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

  console.log("Demo seed complete");
  console.log("Organizations:");
  console.log(`- ${primaryOrg.name} (${primaryOrg.id})`);
  console.log(`- ${secondaryOrg.name} (${secondaryOrg.id})`);
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
