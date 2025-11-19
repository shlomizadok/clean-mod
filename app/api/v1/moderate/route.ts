// app/api/v1/moderate/route.ts

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { moderateWithUnitary } from "@/lib/moderation/unitaryProvider";

const HASH_ALGO = "sha256";
const DEFAULT_FREE_QUOTA = 5_000;

function hashApiKey(rawKey: string): string {
  return crypto.createHash(HASH_ALGO).update(rawKey).digest("hex");
}

function getApiKeyFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  const apiKeyHeader = req.headers.get("x-api-key");
  if (apiKeyHeader && apiKeyHeader.trim().length > 0) {
    return apiKeyHeader.trim();
  }

  return null;
}

function hashInput(text: string): string {
  return crypto.createHash(HASH_ALGO).update(text).digest("hex");
}

/**
 * Get the current month [start, end) range for usage aggregation.
 */
function getCurrentMonthRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

export async function POST(req: NextRequest) {
  try {
    // 1) Auth with API key
    const apiKeyRaw = getApiKeyFromRequest(req);
    if (!apiKeyRaw) {
      return NextResponse.json(
        {
          error:
            "Missing API key. Use Authorization: Bearer <KEY> or x-api-key.",
        },
        { status: 401 }
      );
    }

    const apiKeyHash = hashApiKey(apiKeyRaw);

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        keyHash: apiKeyHash,
        isActive: true,
      },
      include: {
        organization: true,
      },
    });

    if (!apiKey || !apiKey.organization) {
      return NextResponse.json(
        { error: "Invalid or inactive API key." },
        { status: 401 }
      );
    }

    const org = apiKey.organization;

    // 2) Parse body
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const text = body?.text;
    const modelKey = (body?.model as string) || "english-basic";

    if (typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid "text" field in request body.' },
        { status: 400 }
      );
    }

    // 3) Fetch active subscription & plan
    const activeSub = await prisma.subscription.findFirst({
      where: {
        orgId: org.id,
        status: "active",
      },
      include: {
        plan: true,
      },
    });

    const plan = activeSub?.plan;
    const monthlyQuota = plan?.monthlyQuota ?? DEFAULT_FREE_QUOTA;

    // 4) Calculate this month's usage from UsageCounter
    const now = new Date();
    const { start, end } = getCurrentMonthRange(now);

    const counters = await prisma.usageCounter.findMany({
      where: {
        orgId: org.id,
        date: {
          gte: start,
          lt: end,
        },
      },
    });

    const usedThisMonth = counters.reduce((sum, c) => sum + c.count, 0);

    if (usedThisMonth >= monthlyQuota) {
      return NextResponse.json(
        {
          error:
            "Monthly quota exceeded. Upgrade your CleanMod plan to continue.",
          quota: monthlyQuota,
          used: usedThisMonth,
        },
        { status: 429 }
      );
    }

    // 5) Call moderation core (Unitary for now)
    const moderationResult = await moderateWithUnitary(text, "english-basic");

    // 6) Update lastUsedAt on API key
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: now },
    });

    // 7) Log to DB
    const inputHash = hashInput(text);

    const log = await prisma.moderationLog.create({
      data: {
        orgId: org.id,
        apiKeyId: apiKey.id,
        provider: moderationResult.provider,
        model: moderationResult.providerModel,
        inputHash,
        rawScore: {}, // can store provider raw later
        normalized: moderationResult as unknown as Prisma.InputJsonValue,
        decision: moderationResult.decision,
      },
    });

    // 8) Increment usage counter (daily)
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    await prisma.usageCounter.upsert({
      where: {
        orgId_date: {
          orgId: org.id,
          date: day,
        },
      },
      update: {
        count: { increment: 1 },
      },
      create: {
        orgId: org.id,
        date: day,
        count: 1,
      },
    });

    // 9) Response to client
    return NextResponse.json(
      {
        id: log.id,
        model: modelKey,
        provider: moderationResult.provider,
        providerModel: moderationResult.providerModel,
        decision: moderationResult.decision,
        overall_score: moderationResult.overall_score,
        threshold: moderationResult.threshold,
        categories: moderationResult.categories,
        created_at: log.createdAt.toISOString(),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Moderation API error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
