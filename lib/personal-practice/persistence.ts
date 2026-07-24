import type { AttemptEvidence, ProgressDecision, RehearsalStage, Variation } from "./variation-engine";

export const PERSONAL_PRACTICE_KEY = "eq-personal-practice-pilot-v1";

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
};

export type PersonalPracticeState = {
  journeyId: string;
  targetSkillId: string;
  stage: RehearsalStage;
  repair: RepairDraft | null;
  attempts: PersonalAttempt[];
  bridgeAccepted: boolean | null;
};

export function emptyPersonalPracticeState(targetSkillId: string): PersonalPracticeState {
  return {
    journeyId: crypto.randomUUID(),
    targetSkillId,
    stage: "guided",
    repair: null,
    attempts: [],
    bridgeAccepted: null,
  };
}

export function readPersonalPracticeState(targetSkillId: string): PersonalPracticeState {
  try {
    const saved = localStorage.getItem(PERSONAL_PRACTICE_KEY);
    return saved ? JSON.parse(saved) as PersonalPracticeState : emptyPersonalPracticeState(targetSkillId);
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
