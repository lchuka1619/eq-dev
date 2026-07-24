import type { AttemptEvidence, ProgressDecision, RehearsalStage, Variation } from "./variation-engine";
import type { PracticeContext } from "../context-to-mastery/practice-context";
import type { PracticeEvaluation, SkillCriterionId } from "../context-to-mastery/skill-rubric";

export const PERSONAL_PRACTICE_KEY = "eq-personal-practice-pilot-v1";

export type BridgeLifecycle = {
  id: string;
  status: "none" | "accepted" | "skipped" | "reflected";
  offeredAt: string | null;
  respondedAt: string | null;
  didIt: boolean | null;
  intensityBefore: number | null;
  intensityAfter: number | null;
  reflection: string;
};

export type RepairDraft = {
  moments: string[];
  selectedMoment: string;
  fact: string;
  conclusion: string;
  saveChoice: "device" | "cloud" | "none";
};

export type PersonalAttempt = AttemptEvidence & {
  id: string;
  variation: Variation;
  response: string;
  reflection: string;
  decision: ProgressDecision;
  completedAt: string;
  evaluation?: PracticeEvaluation;
  retryOfAttemptId?: string;
  focusedCriterionId?: SkillCriterionId;
  criterionImproved?: boolean;
};

export type PersonalPracticeState = {
  journeyId: string;
  targetSkillId: string;
  stage: RehearsalStage;
  context: PracticeContext | null;
  repair: RepairDraft | null;
  attempts: PersonalAttempt[];
  bridgeAccepted: boolean | null;
  bridge: BridgeLifecycle;
  surpriseOptIn: boolean;
};

export function emptyPersonalPracticeState(targetSkillId: string): PersonalPracticeState {
  return {
    journeyId: crypto.randomUUID(),
    targetSkillId,
    stage: "guided",
    context: null,
    repair: null,
    attempts: [],
    bridgeAccepted: null,
    bridge: {
      id: crypto.randomUUID(),
      status: "none",
      offeredAt: null,
      respondedAt: null,
      didIt: null,
      intensityBefore: null,
      intensityAfter: null,
      reflection: "",
    },
    surpriseOptIn: false,
  };
}

export function readPersonalPracticeState(targetSkillId: string): PersonalPracticeState {
  try {
    const saved = localStorage.getItem(PERSONAL_PRACTICE_KEY);
    if (!saved) return emptyPersonalPracticeState(targetSkillId);
    const parsed = JSON.parse(saved) as Partial<PersonalPracticeState>;
    const empty = emptyPersonalPracticeState(targetSkillId);
    return {
      ...empty,
      ...parsed,
      bridge: parsed.bridge ?? {
        ...empty.bridge,
        status: parsed.bridgeAccepted === true ? "accepted" : parsed.bridgeAccepted === false ? "skipped" : "none",
      },
    };
  } catch {
    return emptyPersonalPracticeState(targetSkillId);
  }
}

export function writePersonalPracticeState(state: PersonalPracticeState) {
  try { localStorage.setItem(PERSONAL_PRACTICE_KEY, JSON.stringify(state)); } catch { /* state remains in memory */ }
}

export function clearPersonalPracticeRepair(state: PersonalPracticeState) {
  const next = { ...state, repair: null };
  writePersonalPracticeState(next);
  return next;
}
