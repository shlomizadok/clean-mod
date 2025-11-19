import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./db";

/**
 * Get or create a User record from the current Clerk session
 * This ensures our Prisma User model stays in sync with Clerk
 */
export async function getCurrentUser() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return null;
  }

  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  // Find or create user in our database
  // Handle race conditions by catching unique constraint errors
  const email = clerkUser.emailAddresses[0]?.emailAddress ?? null;
  const firstName = clerkUser.firstName ?? null;
  const lastName = clerkUser.lastName ?? null;

  const userInclude = {
    organizations: {
      include: {
        subscriptions: {
          where: { status: "active" },
          include: { plan: true },
          take: 1,
        },
        usageCounters: true,
      },
    },
  };

  let user = await prisma.user.findUnique({
    where: { clerkId: clerkId },
    include: userInclude,
  });

  if (!user) {
    try {
      // Try to create the user
      user = await prisma.user.create({
        data: {
          clerkId: clerkId,
          email: email,
          firstName: firstName,
          lastName: lastName,
        },
        include: userInclude,
      });
    } catch (error: any) {
      // If unique constraint error, user was created by another request
      // Fetch the existing user
      if (error?.code === "P2002") {
        user = await prisma.user.findUnique({
          where: { clerkId: clerkId },
          include: userInclude,
        });
      } else {
        throw error;
      }
    }
  }

  // Update user info if it changed in Clerk
  if (
    user &&
    (user.email !== email ||
      user.firstName !== firstName ||
      user.lastName !== lastName)
  ) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        email: email,
        firstName: firstName,
        lastName: lastName,
      },
      include: userInclude,
    });
  }

  return user;
}

/**
 * Get the current user's primary organization
 * Creates a default org if none exists
 */
export async function getCurrentOrganization() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  let org = user.organizations[0] || null;

  if (!org) {
    // Create default organization for new users
    org = await prisma.organization.create({
      data: {
        name: `${user.firstName || user.email || "My"} Organization`,
        ownerId: user.id,
      },
      include: {
        subscriptions: {
          where: { status: "active" },
          include: { plan: true },
          take: 1,
        },
        usageCounters: true,
      },
    });
  } else {
    // Reload with full relations if needed
    const reloadedOrg = await prisma.organization.findUnique({
      where: { id: org.id },
      include: {
        subscriptions: {
          where: { status: "active" },
          include: { plan: true },
          take: 1,
        },
        usageCounters: true,
      },
    });
    if (reloadedOrg) {
      org = reloadedOrg;
    }
  }

  return org;
}
