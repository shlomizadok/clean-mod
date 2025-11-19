# Clerk Integration PR Plan

## Overview

This PR integrates Clerk authentication into the CleanMod dashboard, replacing the placeholder auth system with a production-ready authentication solution. Clerk will handle user authentication, session management, and provide user profile information.

## Goals

1. **Secure Dashboard Access**: Protect all `/dashboard/*` routes with Clerk authentication
2. **User Management**: Link Clerk users to our Prisma `User` model for organization ownership
3. **Seamless UX**: Maintain existing dashboard functionality while adding proper auth
4. **Migration Path**: Support existing seed data and provide migration strategy

---

## Changes Summary

### 1. Dependencies

**Add to `package.json`:**

- `@clerk/nextjs` - Clerk Next.js SDK

**Installation:**

```bash
pnpm add @clerk/nextjs
```

---

### 2. Environment Variables

**Add to `.env.local` (and document in `.env.example`):**

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

---

### 3. Prisma Schema Updates

**File: `prisma/schema.prisma`**

**Changes:**

- Add `clerkId` field to `User` model (unique, indexed)
- Make `email` nullable (Clerk manages email)
- Remove `passwordHash` field (Clerk handles passwords)
- Add optional `firstName` and `lastName` fields for better UX

**Updated User model:**

```prisma
model User {
  id           String          @id @default(cuid())
  clerkId      String          @unique // Clerk user ID
  email        String?         // Can be null, synced from Clerk
  firstName    String?
  lastName     String?
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  organizations Organization[]

  @@index([email])
  @@index([clerkId])
}
```

**Migration:**

- Create migration: `prisma migrate dev --name add_clerk_integration`
- Update seed script to use Clerk IDs (or create users via Clerk webhooks)

---

### 4. Clerk Middleware

**New file: `middleware.ts` (root level)**

Protect dashboard routes and handle Clerk authentication:

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
```

---

### 5. Root Layout Updates

**File: `app/layout.tsx`**

Wrap the app with ClerkProvider:

```typescript
import { ClerkProvider } from '@clerk/nextjs';
// ... existing imports

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={...}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
```

---

### 6. Auth Helper Utilities

**New file: `src/lib/auth.ts`**

Create helper functions to sync Clerk users with Prisma:

```typescript
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
  let user = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      organizations: {
        include: {
          subscriptions: {
            where: { status: "active" },
            include: { plan: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!user) {
    // Create user on first login
    user = await prisma.user.create({
      data: {
        clerkId,
        email: clerkUser.emailAddresses[0]?.emailAddress || null,
        firstName: clerkUser.firstName || null,
        lastName: clerkUser.lastName || null,
      },
      include: {
        organizations: {
          include: {
            subscriptions: {
              where: { status: "active" },
              include: { plan: true },
              take: 1,
            },
          },
        },
      },
    });
  } else {
    // Update user info if it changed in Clerk
    if (
      user.email !== clerkUser.emailAddresses[0]?.emailAddress ||
      user.firstName !== clerkUser.firstName ||
      user.lastName !== clerkUser.lastName
    ) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          email: clerkUser.emailAddresses[0]?.emailAddress || null,
          firstName: clerkUser.firstName || null,
          lastName: clerkUser.lastName || null,
        },
        include: {
          organizations: {
            include: {
              subscriptions: {
                where: { status: "active" },
                include: { plan: true },
                take: 1,
              },
            },
          },
        },
      });
    }
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
    org = await prisma.organization.findUnique({
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
  }

  return org;
}
```

---

### 7. Sign-In & Sign-Up Pages

**New file: `app/sign-in/[[...sign-in]]/page.tsx`**

```typescript
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <SignIn />
    </div>
  );
}
```

**New file: `app/sign-up/[[...sign-up]]/page.tsx`**

```typescript
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <SignUp />
    </div>
  );
}
```

---

### 8. Dashboard Layout Updates

**File: `app/dashboard/layout.tsx`**

Update to use Clerk user info and add sign-out:

```typescript
import { UserButton } from "@clerk/nextjs";
import { getCurrentUser } from "@/lib/auth";
// ... existing imports

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          {/* ... existing logo ... */}

          <div className="flex items-center gap-3">
            {user && (
              <div className="text-right text-xs text-slate-500">
                <div className="font-medium text-slate-700">
                  {user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.email || "User"}
                </div>
                {user.email && (
                  <div className="text-slate-500">{user.email}</div>
                )}
              </div>
            )}
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>
      {/* ... rest of layout ... */}
    </div>
  );
}
```

---

### 9. Dashboard Page Updates

**File: `app/dashboard/page.tsx`**

Update to use `getCurrentOrganization()` instead of `findFirst()`:

```typescript
import { getCurrentOrganization } from "@/lib/auth";
// Remove: import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  const org = await getCurrentOrganization();

  if (!org) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-600">
          Unable to load organization. Please try refreshing.
        </p>
      </div>
    );
  }

  // ... rest of existing logic using `org` ...
}
```

---

### 10. API Keys Page Updates

**File: `app/dashboard/api-keys/page.tsx`**

Update to use `getCurrentOrganization()`:

```typescript
import { getCurrentOrganization } from "@/lib/auth";
// Update all queries to use the org from getCurrentOrganization()
```

---

### 11. Clerk Webhooks (Optional but Recommended)

**New file: `app/api/webhooks/clerk/route.ts`**

Handle Clerk user events to keep Prisma in sync:

```typescript
import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Please add CLERK_WEBHOOK_SECRET to .env.local");
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- no svix headers", {
      status: 400,
    });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occurred", {
      status: 400,
    });
  }

  const eventType = evt.type;
  const { id, email_addresses, first_name, last_name } = evt.data;

  if (eventType === "user.created") {
    await prisma.user.create({
      data: {
        clerkId: id,
        email: email_addresses[0]?.email_address || null,
        firstName: first_name || null,
        lastName: last_name || null,
      },
    });
  }

  if (eventType === "user.updated") {
    await prisma.user.update({
      where: { clerkId: id },
      data: {
        email: email_addresses[0]?.email_address || null,
        firstName: first_name || null,
        lastName: last_name || null,
      },
    });
  }

  if (eventType === "user.deleted") {
    await prisma.user.delete({
      where: { clerkId: id },
    });
  }

  return new Response("", { status: 200 });
}
```

**Add to `.env.local`:**

```env
CLERK_WEBHOOK_SECRET=whsec_...
```

**Note:** Configure webhook endpoint in Clerk Dashboard:

- URL: `https://your-domain.com/api/webhooks/clerk`
- Events: `user.created`, `user.updated`, `user.deleted`

---

### 12. Update Seed Script

**File: `prisma/seed.ts`**

Update to work with Clerk integration:

**Option A:** Remove User seeding (users created via Clerk)
**Option B:** Create seed users with placeholder Clerk IDs for development

For development, you might want to keep seed data but note that it requires manual Clerk user creation.

---

### 13. Homepage Redirect

**File: `app/page.tsx`**

Add redirect logic for authenticated users:

```typescript
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div>
      {/* Marketing/homepage content */}
      <a href="/sign-in">Sign In</a>
      <a href="/sign-up">Sign Up</a>
    </div>
  );
}
```

---

## Migration Strategy

### For Existing Development Data

1. **Backup existing data** (if any)
2. **Run migration** to add `clerkId` field
3. **Create Clerk users** manually in Clerk Dashboard for existing seed users
4. **Update seed data** with Clerk IDs, or remove seed users and create via Clerk

### For Production

1. Deploy Clerk integration
2. Existing users will need to sign up via Clerk
3. First-time login will auto-create User record via `getCurrentUser()`

---

## Testing Checklist

- [ ] Sign up new user via Clerk
- [ ] Sign in existing user
- [ ] Access protected `/dashboard` routes (should redirect if not authenticated)
- [ ] User profile displays correctly in dashboard header
- [ ] Sign out works and redirects properly
- [ ] Organization creation on first login
- [ ] API keys page works with new auth
- [ ] Dashboard overview page loads with user's org
- [ ] Webhook events sync user data (if implemented)
- [ ] Build succeeds: `pnpm build`
- [ ] No TypeScript errors: `pnpm lint`

---

## Files Changed

### New Files

- `middleware.ts`
- `app/sign-in/[[...sign-in]]/page.tsx`
- `app/sign-up/[[...sign-up]]/page.tsx`
- `src/lib/auth.ts`
- `app/api/webhooks/clerk/route.ts` (optional)
- `docs/clerk-integration-pr-plan.md` (this file)

### Modified Files

- `package.json` (add @clerk/nextjs)
- `prisma/schema.prisma` (update User model)
- `app/layout.tsx` (add ClerkProvider)
- `app/dashboard/layout.tsx` (add UserButton, use getCurrentUser)
- `app/dashboard/page.tsx` (use getCurrentOrganization)
- `app/dashboard/api-keys/page.tsx` (use getCurrentOrganization)
- `app/page.tsx` (add auth redirect)
- `prisma/seed.ts` (update for Clerk)
- `.env.example` (add Clerk env vars)

### Migration Files

- `prisma/migrations/YYYYMMDDHHMMSS_add_clerk_integration/migration.sql`

---

## Rollout Steps

1. **Create feature branch**: `git checkout -b feat/clerk-integration`
2. **Install dependencies**: `pnpm add @clerk/nextjs`
3. **Set up Clerk account** and get API keys
4. **Update Prisma schema** and run migration
5. **Implement middleware** and auth helpers
6. **Update dashboard pages** to use new auth
7. **Add sign-in/sign-up pages**
8. **Test locally** with Clerk test keys
9. **Configure webhooks** (optional but recommended)
10. **Update documentation** and environment variable examples
11. **Create PR** with this plan and testing notes

---

## Notes

- **Clerk Free Tier**: Supports up to 10,000 MAU (Monthly Active Users), which should be sufficient for MVP
- **Styling**: Clerk components can be customized via their theming system if needed
- **Multi-org Support**: Current implementation creates one org per user. Multi-org support can be added later
- **API Key Auth**: Unchanged - API routes still use API key authentication, separate from dashboard auth

---

## Future Enhancements (Post-MVP)

- Organization switching UI
- Team member invitations
- Role-based access control (RBAC)
- Custom Clerk themes to match CleanMod branding
- SSO integration for enterprise customers
