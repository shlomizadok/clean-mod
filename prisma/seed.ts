// prisma/seed.ts
import "dotenv/config";
import crypto from "crypto";
import { prisma } from "../src/lib/db";

async function main() {
  // Note: Users are now created via Clerk authentication.
  // For development, you can create a user via Clerk Dashboard and then
  // manually create an organization, or the first login will auto-create one.

  // For seeding test data, we'll create plans and note that users/orgs
  // should be created via Clerk or will be auto-created on first login.

  // 1) Plans (these are independent of users)

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

  console.log("✅ Seeded CleanMod data:");
  console.log("  Plans:", freePlan.name, starterPlan.name, proPlan.name);
  console.log("");
  console.log("ℹ️  Note: Users and organizations are now managed via Clerk.");
  console.log("  - Sign up via /sign-up to create your first user");
  console.log("  - An organization will be auto-created on first login");
  console.log("  - You can then create API keys from the dashboard");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
