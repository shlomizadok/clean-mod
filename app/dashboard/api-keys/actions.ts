"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentOrganization } from "@/lib/auth";
import { generateApiKey, hashApiKey } from "@/lib/api-keys";

export type CreateApiKeyResult =
  | { success: true; rawKey: string; name: string }
  | { success: false; error: string };

/**
 * Get the maximum number of active API keys allowed for a plan
 */
function getApiKeyLimit(planName: string | null | undefined): number | null {
  if (!planName) {
    // Default to free plan if no plan
    return 2;
  }

  const planNameLower = planName.toLowerCase();

  switch (planNameLower) {
    case "free":
      return 2;
    case "starter":
      return 5;
    case "pro":
      return 10;
    case "enterprise":
      // Enterprise has no limit (or very high limit)
      return null;
    default:
      // Unknown plan, default to free
      return 2;
  }
}

/**
 * Create a new API key for the current organization
 */
export async function createApiKey(name?: string): Promise<CreateApiKeyResult> {
  try {
    const org = await getCurrentOrganization();

    if (!org) {
      return { success: false, error: "Not authenticated" };
    }

    // Fetch active subscription & plan
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
    const planName = plan?.name;

    // Get API key limit for this plan
    const apiKeyLimit = getApiKeyLimit(planName);

    // Count active keys for this organization
    const activeKeyCount = await prisma.apiKey.count({
      where: {
        orgId: org.id,
        isActive: true,
      },
    });

    // Check if limit is reached (null means no limit for enterprise)
    if (apiKeyLimit !== null && activeKeyCount >= apiKeyLimit) {
      if (planName?.toLowerCase() === "enterprise") {
        return {
          success: false,
          error:
            "You've reached the maximum number of API keys. Please contact us to increase your limit.",
        };
      }
      return {
        success: false,
        error:
          "You've reached the maximum number of API keys for your plan. Deactivate an existing key or upgrade your plan.",
      };
    }

    // Generate raw key and hash
    const rawKey = generateApiKey();
    const keyHash = hashApiKey(rawKey);

    // Use provided name or generate one with timestamp
    const keyName =
      name?.trim() || `Key ${new Date().toISOString().replace(/[:.]/g, "-")}`;

    // Store hashed key in database
    await prisma.apiKey.create({
      data: {
        orgId: org.id,
        name: keyName,
        keyHash,
        isActive: true,
      },
    });

    // Revalidate the API keys page
    revalidatePath("/dashboard/api-keys");

    return { success: true, rawKey, name: keyName };
  } catch (error: any) {
    console.error("Error creating API key:", error);
    return {
      success: false,
      error: error?.message || "Failed to create API key",
    };
  }
}

export type DeactivateApiKeyResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Deactivate an API key
 */
export async function deactivateApiKey(
  keyId: string
): Promise<DeactivateApiKeyResult> {
  try {
    const org = await getCurrentOrganization();

    if (!org) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify the key belongs to the current organization
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: keyId,
        orgId: org.id,
      },
    });

    if (!apiKey) {
      return { success: false, error: "API key not found" };
    }

    // Deactivate the key
    await prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false },
    });

    // Revalidate the API keys page
    revalidatePath("/dashboard/api-keys");

    return { success: true };
  } catch (error: any) {
    console.error("Error deactivating API key:", error);
    return {
      success: false,
      error: error?.message || "Failed to deactivate API key",
    };
  }
}
