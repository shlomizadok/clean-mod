// src/lib/moderation/unitaryProvider.ts

import { InferenceClient } from "@huggingface/inference";
import type { NormalizedModerationResult } from "./types";

export type UnitaryModelKey = "english-basic";

/**
 * Custom error class for authentication failures with the moderation provider.
 * This allows for type-safe error checking using instanceof.
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

// Model config
const HF_MODEL_ID =
  process.env.HF_MODEL_ID || "unitary/multilingual-toxic-xlm-roberta";

const MODEL_CONFIG: Record<
  UnitaryModelKey,
  { providerModel: string; defaultThreshold: number }
> = {
  "english-basic": {
    providerModel: HF_MODEL_ID,
    defaultThreshold: 0.8,
  },
};

type HfLabelScore = { label: string; score: number };

// Re-use one client per process (lazy initialization)
let hfClient: InferenceClient | null = null;

function getHfClient(): InferenceClient {
  if (!hfClient) {
    const token = process.env.HF_API_TOKEN || "";
    hfClient = new InferenceClient(token);
  }
  return hfClient;
}

/**
 * Calls HF text classification via the official JS client and
 * normalizes to CleanMod's `NormalizedModerationResult`.
 */
export async function moderateWithUnitary(
  text: string,
  modelKey: UnitaryModelKey = "english-basic"
): Promise<NormalizedModerationResult> {
  const startTimer = performance.now();
  const config = MODEL_CONFIG[modelKey];

  if (!process.env.HF_API_TOKEN) {
    console.error(
      "[CleanMod] HF_API_TOKEN is not set; returning fallback result."
    );
    return buildFallbackResult(config.providerModel, config.defaultThreshold);
  }

  let raw: unknown;
  try {
    const hf = getHfClient();
    raw = await hf.textClassification({
      model: HF_MODEL_ID,
      inputs: text,
      // provider: 'hf-inference', // optional – default "auto" will route via HF Inference
    });
  } catch (err) {
    // Extract status code from nested HTTP response objects if available
    const httpResponse = (err as any)?.httpResponse;
    const httpRequest = (err as any)?.httpRequest;
    const statusFromResponse = httpResponse?.status || httpResponse?.statusCode;
    const statusFromRequest = httpRequest?.status || httpRequest?.statusCode;
    const status =
      (err as any)?.status ??
      (err as any)?.statusCode ??
      statusFromResponse ??
      statusFromRequest;

    // Log essential error information
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[CleanMod] HF InferenceClient error:", {
      message: errorMessage,
      status,
      name: err instanceof Error ? err.name : undefined,
    });

    // Check if this is an authentication/authorization error
    // Create an error object with the extracted status for checking
    const errWithStatus =
      status && typeof err === "object" && err !== null
        ? { ...err, status, statusCode: status }
        : err;
    const isAuthError = isAuthenticationError(errWithStatus);

    if (isAuthError) {
      // Throw authentication error so it propagates to route handler
      throw new AuthenticationError(
        "Hugging Face API authentication failed. Please check your HF_API_TOKEN environment variable."
      );
    }

    // For any other errors, throw instead of falling back to "allow"
    // This ensures we don't silently allow content when moderation fails
    throw new Error(`Moderation service error: ${errorMessage}`);
  }

  const labelScores = extractLabelScores(raw);

  if (!labelScores.length) {
    console.error(
      "[CleanMod] HF textClassification returned no label scores. Raw response:",
      JSON.stringify(raw, null, 2)
    );
    // Throw error instead of falling back to "allow" - this is a service issue
    throw new Error(
      "Moderation service returned invalid response format. Please contact support."
    );
  }

  const categories: Record<string, number> = {};

  for (const item of labelScores) {
    if (!item || typeof item.label !== "string") continue;
    const label = item.label.toLowerCase();
    const score = typeof item.score === "number" ? item.score : 0;

    if (label.includes("tox")) {
      categories.toxicity = maxCat(categories.toxicity, score);
    } else if (label.includes("insult")) {
      categories.insult = maxCat(categories.insult, score);
    } else if (label.includes("identity") || label.includes("id_hate")) {
      categories.identity_attack = maxCat(categories.identity_attack, score);
    } else if (label.includes("threat")) {
      categories.threat = maxCat(categories.threat, score);
    } else if (label.includes("obscene") || label.includes("curse")) {
      categories.obscene = maxCat(categories.obscene, score);
    } else if (label.includes("sexual")) {
      categories.sexual = maxCat(categories.sexual, score);
    }
  }

  // If the model is very binary (e.g. label like "toxic"/"not toxic"),
  // make sure we still populate toxicity.
  if (Object.keys(categories).length === 0 && labelScores.length > 0) {
    const toxicLike = labelScores.find((i) =>
      i.label.toLowerCase().includes("tox")
    );
    if (toxicLike && typeof toxicLike.score === "number") {
      categories.toxicity = toxicLike.score;
    }
  }

  const categoryValues = Object.values(categories);
  const overall_score = categoryValues.length ? Math.max(...categoryValues) : 0;

  const threshold = config.defaultThreshold;
  const is_toxic = overall_score >= threshold;
  const decision = is_toxic ? "flag" : "allow";

  const result: NormalizedModerationResult = {
    overall_score,
    is_toxic,
    categories,
    provider: "unitary",
    providerModel: config.providerModel,
    decision,
    threshold,
  };

  const endTimer = performance.now();
  console.log(`[CleanMod] Unitary moderation took ${endTimer - startTimer}ms`);

  return result;
}

/**
 * HF client *usually* returns an array of {label, score}, but older / different
 * pipelines can nest it one level deeper. Handle both.
 */
function extractLabelScores(raw: unknown): HfLabelScore[] {
  if (!Array.isArray(raw)) return [];

  // Case 1: [ { label, score }, ... ]
  if (raw.length && !Array.isArray(raw[0])) {
    return raw as HfLabelScore[];
  }

  // Case 2: [ [ { label, score }, ... ] ]
  if (raw.length && Array.isArray(raw[0])) {
    return (raw[0] as HfLabelScore[]) || [];
  }

  return [];
}

function maxCat(existing: number | undefined, next: number): number {
  if (existing === undefined) return next;
  return next > existing ? next : existing;
}

// Authentication-related keywords for error message detection
const AUTH_KEYWORDS = [
  "unauthorized",
  "forbidden",
  "invalid token",
  "authentication",
  "invalid api key",
  "invalid api token",
  "authentication failed",
  "invalid credentials",
] as const;

/**
 * Checks if an error is an authentication/authorization error.
 * HF InferenceClient may throw errors with status codes or error messages
 * indicating invalid tokens or authentication issues.
 */
function isAuthenticationError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;

  // Check for HTTP status codes (combined check for status and statusCode)
  const status = (err as any).status ?? (err as any).statusCode;
  if (typeof status === "number" && [401, 403].includes(status)) {
    return true;
  }

  // Check error message for authentication-related keywords
  const errorMessage = err instanceof Error ? err.message : String(err);
  const lowerMessage = errorMessage.toLowerCase();

  return AUTH_KEYWORDS.some((keyword) => lowerMessage.includes(keyword));
}

function buildFallbackResult(
  providerModel: string,
  threshold: number
): NormalizedModerationResult {
  return {
    overall_score: 0,
    is_toxic: false,
    categories: {},
    provider: "unitary",
    providerModel,
    decision: "allow",
    threshold,
  };
}
