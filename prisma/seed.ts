// prisma/seed.ts
import "dotenv/config";
import crypto from "crypto";
import { prisma } from "../src/lib/db";

async function main() {
  // 1) Dashboard user
  const user = await prisma.user.upsert({
    where: { email: "admin@cleanmod.test" },
    update: {},
    create: {
      email: "admin@cleanmod.test",
    },
  });

  // 2) Organization
  const org = await prisma.organization.upsert({
    where: { id: "test-org-1" },
    update: {},
    create: {
      id: "test-org-1",
      name: "CleanMod Test Org",
      ownerId: user.id,
    },
  });

  // 3) Plans
  const freePlan = await prisma.plan.upsert({
    where: { name: "free" },
    update: {},
    create: {
      name: "free",
      monthlyQuota: 5_000,
      modelsAllowed: ["english-basic"],
    },
  });

  const starterPlan = await prisma.plan.upsert({
    where: { name: "starter" },
    update: {},
    create: {
      name: "starter",
      monthlyQuota: 50_000,
      modelsAllowed: ["english-basic"],
    },
  });

  const proPlan = await prisma.plan.upsert({
    where: { name: "pro" },
    update: {},
    create: {
      name: "pro",
      monthlyQuota: 250_000,
      modelsAllowed: ["english-basic"],
    },
  });

  // 4) Attach FREE subscription to the org (idempotent-ish)
  // For simplicity, we'll just ensure there is at least one "active" subscription.
  const existingActive = await prisma.subscription.findFirst({
    where: { orgId: org.id, status: "active" },
  });

  if (!existingActive) {
    await prisma.subscription.create({
      data: {
        orgId: org.id,
        planId: freePlan.id,
        status: "active",
      },
    });
  }

  // 5) Known API key for dev/testing
  const rawKey = "dev_123"; // used in curl
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  await prisma.apiKey.upsert({
    where: { keyHash },
    update: {
      isActive: true,
      orgId: org.id,
    },
    create: {
      orgId: org.id,
      name: "dev-key",
      keyHash,
      isActive: true,
    },
  });

  console.log("✅ Seeded CleanMod data:");
  console.log("  User email:", user.email);
  console.log("  Org ID:", org.id);
  console.log("  Plans:", freePlan.name, starterPlan.name, proPlan.name);
  console.log("  API key (raw):", rawKey);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
