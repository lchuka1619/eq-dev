import type { PersonalAttempt, PersonalPracticeState } from "../personal-practice/persistence.ts";
import type { RehearsalStage } from "../personal-practice/variation-engine.ts";
import {
  SKILL_CRITERION_IDS,
  type SkillCriterionId,
} from "./skill-rubric.ts";

export type CriterionStability = {
  id: SkillCriterionId;
  label: string;
  variantCount: number;
  stable: boolean;
};

export type MasterySummary = {
  targetSkillId: string;
  targetSkillLabel: string;
  supportLevel: RehearsalStage;
  usableAttemptCount: number;
  distinctVariantCount: number;
  confirmedAcrossDays: boolean;
  criteria: CriterionStability[];
  nextRecommendation: string;
};

const criterionLabels: Record<SkillCriterionId, string> = {
  links_to_thread: "Өмнөх яриатай холбох",
  adds_clear_point: "Тодорхой санаа нэмэх",
  leaves_room: "Үргэлжлүүлэх орон зай үлдээх",
};

function usable(attempt: PersonalAttempt) {
  return attempt.completed &&
    attempt.validAttempt === true &&
    (attempt.demonstratedCriteria ?? 0) >= 2 &&
    !attempt.safeFinished;
}

export function buildMasterySummary(state: PersonalPracticeState): MasterySummary {
  const uniqueAttempts = state.attempts.filter((attempt, index, all) =>
    all.findIndex((candidate) => candidate.id === attempt.id) === index
  );
  const usableAttempts = uniqueAttempts.filter(usable);
  const distinctVariantCount = new Set(usableAttempts.map((attempt) => attempt.variation.id)).size;
  const confirmedAcrossDays = new Set(
    usableAttempts.map((attempt) => attempt.completedAt.slice(0, 10)),
  ).size >= 2;
  const criteria = SKILL_CRITERION_IDS.map((id): CriterionStability => {
    const variantCount = new Set(usableAttempts
      .filter((attempt) =>
        attempt.evaluation?.criteria.some((criterion) =>
          criterion.id === id && criterion.evidence === "present"
        )
      )
      .map((attempt) => attempt.variation.id)).size;
    return {
      id,
      label: criterionLabels[id],
      variantCount,
      stable: variantCount >= 2,
    };
  });
  const nextCriterion = criteria.find((criterion) => !criterion.stable);
  const nextRecommendation = distinctVariantCount < 2
    ? "Ижил чадварыг өөр нэг жижиг нөхцөлд давтаж баталгаажуулаарай."
    : !confirmedAcrossDays
      ? "Дараагийн өдөр нэг богино давталтаар чадвараа дахин баталгаажуулаарай."
      : nextCriterion
        ? `${nextCriterion.label} шалгуурыг нэг өөр хувилбарт focused retry хийгээрэй.`
        : state.stage === "independent"
          ? "Хүсвэл аюулгүй Light Surprise хувилбарыг сонгож болно."
          : "Одоогийн support level дээр нэг утгатай давталт хийгээрэй.";

  return {
    targetSkillId: state.targetSkillId,
    targetSkillLabel: "Ярианд тайван нэгдэж, нэг тодорхой санаа нэмэх",
    supportLevel: state.stage,
    usableAttemptCount: usableAttempts.length,
    distinctVariantCount,
    confirmedAcrossDays,
    criteria,
    nextRecommendation,
  };
}
