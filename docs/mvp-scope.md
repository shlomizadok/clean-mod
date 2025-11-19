Nice, bro. Here’s a markdown spec you can drop straight into something like `docs/cleanmod-spec.md` (or `CLEANMOD_SPEC.md`) in your new Next.js repo.

````markdown
# CleanMod – Project Spec

## 1. Overview

**CleanMod** is a developer-focused text moderation service.

- **Core**: Open-source moderation engine (Unitary-based) with a normalized schema.
- **SaaS**: Hosted, multi-tenant API with API keys, quotas, billing, logs & dashboard.
- **MVP focus**: English moderation, Unitary model as default, with OpenAI Moderation planned as a premium/optional provider later.

Primary use cases:

- Moderating comments, reviews, and UGC.
- Integrations via JS SDK, WordPress plugin, and simple HTTP API.

---

## 2. High-Level Architecture

Single Next.js app (App Router) with:

- **Public site**: marketing, docs.
- **Dashboard**: auth, API keys, usage, logs.
- **API routes**: `/api/v1/moderate`, internal admin APIs.

Core layers:

1. **API Layer**
   - Auth via API key header.
   - Request validation & rate limiting.
   - Calls moderation router.

2. **Moderation Core**
   - Normalized moderation response schema.
   - Provider abstraction:
     - `UnitaryProvider` (MVP, open model).
     - `OpenAIProvider` (future premium).
   - Policy logic: thresholds → `allow | flag | block`.

3. **Persistence**
   - Postgres via Prisma (hosted DB).
   - Models: `User`, `Organization`, `ApiKey`, `Plan`, `Subscription`, `ModerationLog`, `UsageCounter`.

4. **Billing & Plans**
   - Stripe for subscriptions.
   - Plans define quotas + allowed models.

---

## 3. Tech Stack

- **Framework**: Next.js (App Router, TypeScript).
- **Backend**: Next.js Route Handlers under `/app/api`.
- **DB**: Postgres + Prisma.
- **Auth (dashboard)**: Simple email/password or magic link (can use next-auth or custom).
- **Styling**: Tailwind CSS (optional but recommended).
- **Inference (MVP)**:
  - Option 1: Call Unitary model via Hugging Face Inference or similar.
  - Option 2: Later – self-hosted model (PyTorch/ONNX) behind an internal HTTP endpoint.
- **Billing**: Stripe.

---

## 4. Folder / Repo Structure (Initial)

Suggested structure:

```txt
/
├─ app/
│  ├─ (marketing)/           # public site
│  │  └─ page.tsx
│  ├─ (dashboard)/dashboard/ # authenticated dashboard
│  │  ├─ page.tsx
│  │  ├─ keys/               # API key management
│  │  ├─ usage/              # usage charts
│  │  └─ logs/               # moderation logs
│  ├─ api/
│  │  ├─ v1/
│  │  │  └─ moderate/route.ts
│  │  └─ internal/           # dashboard-only APIs (keys, logs)
│  └─ layout.tsx
├─ src/
│  ├─ lib/
│  │  ├─ db.ts               # Prisma client
│  │  ├─ auth.ts             # dashboard auth helpers
│  │  ├─ rate-limit.ts       # per API key limiting
│  │  ├─ moderation/
│  │  │  ├─ types.ts         # Normalized result types
│  │  │  ├─ provider.ts      # interface + registry
│  │  │  ├─ providers/
│  │  │  │  ├─ unitary.ts    # MVP provider
│  │  │  │  └─ openai.ts     # future
│  │  │  └─ router.ts        # model selection + policy
│  │  ├─ plans.ts            # plan + quota config
│  ├─ services/
│  │  ├─ usage.ts
│  │  └─ logs.ts
│  └─ ui/                    # components
├─ prisma/
│  └─ schema.prisma
├─ docs/
│  └─ cleanmod-spec.md       # this file
└─ package.json
````

Later you can add:

* `packages/core` (OSS engine).
* `packages/sdk-js` (JS SDK).
* `plugins/wordpress` (WP plugin, separate repo or folder).

---

## 5. Database Schema (Prisma Draft)

This is a starting point (adjust as needed):

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id            String         @id @default(cuid())
  email         String         @unique
  passwordHash  String?
  createdAt     DateTime       @default(now())
  organizations Organization[] @relation("UserOrganizations")
}

model Organization {
  id            String         @id @default(cuid())
  name          String
  createdAt     DateTime       @default(now())
  ownerId       String
  owner         User           @relation(fields: [ownerId], references: [id])
  users         User[]         @relation("UserOrganizations")
  apiKeys       ApiKey[]
  subscriptions Subscription[]
  logs          ModerationLog[]
  usageCounters UsageCounter[]
}

model ApiKey {
  id          String      @id @default(cuid())
  orgId       String
  organization Organization @relation(fields: [orgId], references: [id])
  name        String
  keyHash     String      @unique
  isActive    Boolean     @default(true)
  createdAt   DateTime    @default(now())
  lastUsedAt  DateTime?
  logs        ModerationLog[]
}

model Plan {
  id              String          @id @default(cuid())
  name            String          @unique
  monthlyQuota    Int             // number of moderation calls
  modelsAllowed   Json            // e.g. ["english-basic", "english-pro"]
  createdAt       DateTime        @default(now())
  subscriptions   Subscription[]
}

model Subscription {
  id                  String        @id @default(cuid())
  orgId               String
  organization        Organization  @relation(fields: [orgId], references: [id])
  planId              String
  plan                Plan          @relation(fields: [planId], references: [id])
  stripeCustomerId    String?
  stripeSubscriptionId String?
  status              String        // "active" | "trialing" | "canceled" | etc.
  renewsAt            DateTime?
  createdAt           DateTime      @default(now())
}

model ModerationLog {
  id          String       @id @default(cuid())
  orgId       String
  organization Organization @relation(fields: [orgId], references: [id])
  apiKeyId    String?
  apiKey      ApiKey?      @relation(fields: [apiKeyId], references: [id])
  createdAt   DateTime     @default(now())
  provider    String       // "unitary" | "openai"
  model       String       // e.g. "unitary/multilingual-toxic-xlm-roberta"
  inputHash   String       // hash of input text (for dedup/privacy)
  rawScore    Json         // provider raw response (optional, can truncate)
  normalized  Json         // normalized result according to CleanMod schema
  decision    String       // "allow" | "flag" | "block"
}

model UsageCounter {
  id        String       @id @default(cuid())
  orgId     String
  organization Organization @relation(fields: [orgId], references: [id])
  date      DateTime      // granularity: daily or month-start
  count     Int           @default(0)
  @@unique([orgId, date])
}
```

---

## 6. Moderation Core – Types & Providers

### Normalized Result Type (TS)

```ts
// src/lib/moderation/types.ts

export type ModerationDecision = "allow" | "flag" | "block";

export type NormalizedCategories = {
  toxicity?: number;        // 0–1
  insult?: number;
  identity_attack?: number;
  threat?: number;
  obscene?: number;
  sexual?: number;
  // Extend later: hate, self_harm, violence, etc.
};

export interface NormalizedModerationResult {
  overall_score: number;       // 0–1 (max or weighted score)
  is_toxic: boolean;
  categories: NormalizedCategories;
  provider: "unitary" | "openai";
  providerModel: string;
  decision: ModerationDecision;
  threshold: number;           // used to decide is_toxic/decision
}
```

### Provider Interface

```ts
// src/lib/moderation/provider.ts

export interface ModerationProvider {
  name: "unitary" | "openai";
  supports(modelKey: string): boolean;
  moderate(
    text: string,
    modelKey: string
  ): Promise<NormalizedModerationResult>;
}
```

### Model Map

```ts
// src/lib/moderation/router.ts (config part)

export const MODEL_MAP = {
  "english-basic": {
    provider: "unitary" as const,
    providerModel: "unitary/multilingual-toxic-xlm-roberta",
    defaultThreshold: 0.8,
  },
  // future:
  // "english-pro": {
  //   provider: "openai" as const,
  //   providerModel: "omni-moderation-latest",
  //   defaultThreshold: 0.8,
  // },
};
```

The router will:

1. Resolve org + plan.
2. Resolve model key (requested vs default).
3. Select provider (`unitary` for MVP).
4. Call provider.
5. Apply threshold → decision.
6. Save `ModerationLog`.
7. Return normalized response to API route.

---

## 7. Public API Contract (MVP)

### Endpoint

`POST /api/v1/moderate`

**Request (JSON):**

```json
{
  "text": "You are absolute trash",
  "model": "english-basic",
  "context": {
    "source": "comment",
    "user_id": "123",
    "metadata": {
      "post_id": "abc"
    }
  }
}
```

**Headers:**

* `Authorization: Bearer <API_KEY>`

**Response (JSON):**

```json
{
  "id": "log_01J123...",
  "model": "english-basic",
  "provider": "unitary",
  "providerModel": "unitary/multilingual-toxic-xlm-roberta",
  "decision": "flag",
  "overall_score": 0.91,
  "threshold": 0.8,
  "categories": {
    "toxicity": 0.91,
    "insult": 0.88,
    "identity_attack": 0.12,
    "threat": 0.05,
    "obscene": 0.40
  },
  "created_at": "2025-11-16T15:00:00.000Z"
}
```

---

## 8. Dashboard – MVP Scope

Dashboard pages (under `/app/(dashboard)/dashboard`):

* **Overview**

  * Total requests this month.
  * Plan info & quota usage.
* **API Keys**

  * List keys (masked).
  * Create / revoke keys.
* **Usage**

  * Simple chart: requests per day.
* **Logs**

  * Table: datetime, model, decision, overall score, and maybe truncated text or hash.
  * Filter by decision / model.

Auth options:

* Simple email+password via custom logic.
* Or next-auth with email provider (magic link).

---

## 9. OSS vs SaaS Boundary (Option A)

**Open-source core repo** (e.g. `cleanmod-core`):

* Minimal HTTP server that:

  * Accepts text.
  * Calls Unitary model.
  * Returns normalized result.
* Re-uses:

  * `NormalizedModerationResult` types.
  * `UnitaryProvider` logic.
* Includes:

  * Dockerfile.
  * Basic CLI.
  * No multi-tenant / no billing / no dashboard.

**Private SaaS repo** (this Next.js app):

* Multi-tenant orgs, API keys.
* Plans, quotas, usage.
* Stripe integration.
* Logs, dashboard.
* Additional providers (e.g. OpenAI).
* Public doc site + marketing.

---

## 10. MVP Milestones

**Milestone 1 – Skeleton**

* Next.js app set up.
* Prisma schema + migrations.
* Basic auth + dashboard shell.

**Milestone 2 – Moderation Core**

* `UnitaryProvider` integrated.
* `MODEL_MAP` and router.
* `/api/v1/moderate` route with API key auth.
* Logs + basic rate limit.

**Milestone 3 – Dashboard**

* View API keys, create/revoke.
* View usage.
* View recent moderation logs.

**Milestone 4 – Integrations**

* Minimal JS/TS client (local file to start).
* Example Next.js middleware snippet.
* Outline for WordPress plugin (can be later repo).

**Milestone 5 – OSS core extraction (optional after MVP)**

* Extract provider + core server into separate public repo.


