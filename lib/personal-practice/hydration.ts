import type { PersonalAttempt, PersonalPracticeState, RepairDraft } from "./persistence.ts";
import { createVariation, type RehearsalStage } from "./variation-engine.ts";
import type { SceneRenderer } from "./variation-engine.ts";

export type CloudJourney = {
  id: string;
  target_skill_id: string;
  current_stage: RehearsalStage;
  state: { bridge_accepted?: boolean | null; surprise_opt_in?: boolean } | null;
};

export type CloudAttempt = {
  id: string;
  variation_id: string;
  variation_seed: string;
  stage: RehearsalStage;
  anxiety_before: number;
  anxiety_after: number;
  completed: boolean;
  safe_finished: boolean;
  used_hint: boolean;
  reflection: string | null;
  decision: PersonalAttempt["decision"];
  completed_at: string;
  renderer?: SceneRenderer;
  media_asset_id?: string | null;
  media_skipped?: boolean;
};

export type CloudRepair = {
  moments: string[] | null;
  selected_moment: string | null;
  fact_text: string | null;
  conclusion_text: string | null;
};

export function mergeHydratedPersonalPractice(
  local: PersonalPracticeState,
  journey: CloudJourney,
  attempts: CloudAttempt[],
  repair: CloudRepair | null,
): PersonalPracticeState {
  if (local.attempts.length > 0 && local.journeyId !== journey.id) return local;
  const cloudAttempts = attempts.map((item, index): PersonalAttempt => ({
    id: item.id,
    stage: item.stage,
    completed: item.completed,
    safeFinished: item.safe_finished,
    usedHint: item.used_hint,
    anxietyBefore: item.anxiety_before,
    anxietyAfter: item.anxiety_after,
    variation: {
      ...createVariation(item.variation_seed, item.stage, index, item.renderer ?? "text_voice"),
      id: item.variation_id,
    },
    response: "",
    reflection: item.reflection ?? "",
    decision: item.decision,
    completedAt: item.completed_at,
  }));
  const mergedAttempts = [...local.attempts, ...cloudAttempts]
    .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index)
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  const cloudRepair: RepairDraft | null = repair ? {
    moments: repair.moments ?? [],
    selectedMoment: repair.selected_moment ?? "",
    fact: repair.fact_text ?? "",
    conclusion: repair.conclusion_text ?? "",
    saveChoice: "cloud",
  } : local.repair;

  return {
    journeyId: journey.id,
    targetSkillId: journey.target_skill_id,
    stage: journey.current_stage,
    repair: cloudRepair,
    attempts: mergedAttempts,
    bridgeAccepted: journey.state?.bridge_accepted ?? local.bridgeAccepted,
    surpriseOptIn: journey.state?.surprise_opt_in ?? local.surpriseOptIn ?? false,
  };
}
