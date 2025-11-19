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

  try {
    if (eventType === "user.created") {
      const data = evt.data as {
        id: string;
        email_addresses: Array<{ email_address: string }>;
        first_name: string | null;
        last_name: string | null;
      };
      // Use upsert to make idempotent - handles race conditions with getCurrentUser()
      await prisma.user.upsert({
        where: { clerkId: data.id },
        create: {
          clerkId: data.id,
          email: data.email_addresses[0]?.email_address ?? null,
          firstName: data.first_name ?? null,
          lastName: data.last_name ?? null,
        },
        update: {
          email: data.email_addresses[0]?.email_address ?? null,
          firstName: data.first_name ?? null,
          lastName: data.last_name ?? null,
        },
      });
    }

    if (eventType === "user.updated") {
      const data = evt.data as {
        id: string;
        email_addresses: Array<{ email_address: string }>;
        first_name: string | null;
        last_name: string | null;
      };
      // Use upsert to handle case where update arrives before create
      await prisma.user.upsert({
        where: { clerkId: data.id },
        create: {
          clerkId: data.id,
          email: data.email_addresses[0]?.email_address ?? null,
          firstName: data.first_name ?? null,
          lastName: data.last_name ?? null,
        },
        update: {
          email: data.email_addresses[0]?.email_address ?? null,
          firstName: data.first_name ?? null,
          lastName: data.last_name ?? null,
        },
      });
    }

    if (eventType === "user.deleted") {
      const data = evt.data as { id: string };
      // Use deleteMany to make idempotent - no error if record doesn't exist
      await prisma.user.deleteMany({
        where: { clerkId: data.id },
      });
    }
  } catch (error: any) {
    // Log error details for debugging
    console.error(`Webhook error type: ${evt.type}`, error);

    // Return 500 for genuine DB problems (not P2025 or P2002)
    // P2025 = record not found (treat as success for idempotency)
    // P2002 = unique constraint (shouldn't happen with upsert, but treat as success)
    if (error?.code === "P2025" || error?.code === "P2002") {
      // These are expected in some race conditions, treat as success
      return new Response("", { status: 200 });
    }

    // For other errors, return 500
    return new Response("Internal server error", { status: 500 });
  }

  return new Response("", { status: 200 });
}
