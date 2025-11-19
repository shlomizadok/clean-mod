"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentOrganization } from "@/lib/auth";
import { generateApiKey, hashApiKey } from "@/lib/api-keys";

export type CreateApiKeyResult =
  | { success: true; rawKey: string; name: string }
  | { success: false; error: string };

/**
 * Create a new API key for the current organization
 */
export async function createApiKey(name?: string): Promise<CreateApiKeyResult> {
  try {
    const org = await getCurrentOrganization();

    if (!org) {
      return { success: false, error: "Not authenticated" };
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
