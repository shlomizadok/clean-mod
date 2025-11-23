"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser, getCurrentOrganization } from "@/lib/auth";

export type UpdateProfileResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Validate name field length
 */
const validateName = (
  name: string | undefined,
  fieldName: string
): UpdateProfileResult | null => {
  if (name !== undefined) {
    const trimmedName = name.trim();
    if (trimmedName && trimmedName.length > 100) {
      return {
        success: false,
        error: `${fieldName} must be 100 characters or less`,
      };
    }
  }
  return null;
};

/**
 * Update user profile information
 */
export async function updateProfile(data: {
  firstName?: string;
  lastName?: string;
}): Promise<UpdateProfileResult> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Validate input lengths
    const firstNameError = validateName(data.firstName, "First name");
    if (firstNameError) return firstNameError;

    const lastNameError = validateName(data.lastName, "Last name");
    if (lastNameError) return lastNameError;

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(data.firstName !== undefined && {
          firstName: data.firstName?.trim() || null,
        }),
        ...(data.lastName !== undefined && {
          lastName: data.lastName?.trim() || null,
        }),
      },
    });

    // Revalidate the profile page
    revalidatePath("/dashboard/profile");

    return { success: true };
  } catch (error: any) {
    console.error("Error updating profile:", error);
    return {
      success: false,
      error: error?.message || "Failed to update profile",
    };
  }
}

/**
 * Update organization's storeInputPreview setting
 * Only the org owner can update this setting
 */
export async function updateOrgPreviewSetting(
  storeInputPreview: boolean
): Promise<UpdateProfileResult> {
  try {
    const org = await getCurrentOrganization();

    if (!org) {
      return { success: false, error: "Organization not found" };
    }

    // Update organization setting
    await prisma.organization.update({
      where: { id: org.id },
      data: { storeInputPreview },
    });

    // Revalidate the profile page and logs page (since it depends on storeInputPreview)
    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard/logs");

    return { success: true };
  } catch (error: any) {
    console.error("Error updating organization preview setting:", error);
    return {
      success: false,
      error: error?.message || "Failed to update preview setting",
    };
  }
}
