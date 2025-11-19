// src/lib/moderation/unitaryProvider.ts

import { InferenceClient } from "@huggingface/inference";
import type { NormalizedModerationResult } from "./types";

export type UnitaryModelKey = "english-basic";

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

// Re-use one client per process
const hf = new InferenceClient(process.env.HF_API_TOKEN || "");

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
    raw = await hf.textClassification({
      model: HF_MODEL_ID,
      inputs: text,
      // provider: 'hf-inference', // optional – default “auto” will route via HF Inference
    });
  } catch (err) {
    console.error("[CleanMod] HF InferenceClient error:", err);
    return buildFallbackResult(config.providerModel, config.defaultThreshold);
  }

  const labelScores = extractLabelScores(raw);

  if (!labelScores.length) {
    console.warn(
      "[CleanMod] HF textClassification returned no label scores:",
      raw
    );
    return buildFallbackResult(config.providerModel, config.defaultThreshold);
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
