// src/lib/moderation/types.ts

export type ModerationDecision = "allow" | "flag" | "block";

export type NormalizedCategories = {
  toxicity?: number; // 0–1
  insult?: number;
  identity_attack?: number;
  threat?: number;
  obscene?: number;
  sexual?: number;
  // extend later with hate, self_harm, etc.
};

export interface NormalizedModerationResult {
  overall_score: number; // 0–1 (max or weighted score)
  is_toxic: boolean;
  categories: NormalizedCategories;
  provider: "unitary" | "openai";
  providerModel: string;
  decision: ModerationDecision;
  threshold: number; // used for is_toxic/decision
}
