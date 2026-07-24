export const SKILL_CRITERION_IDS = [
  "links_to_thread",
  "adds_clear_point",
  "leaves_room",
] as const;

export type SkillCriterionId = typeof SKILL_CRITERION_IDS[number];
export type CriterionEvidence = "present" | "partial" | "missing" | "not_evaluable";

export type SkillCriterion = {
  id: SkillCriterionId;
  label: string;
  evidence: CriterionEvidence;
  evidenceText?: string;
};

export type PracticeEvaluation = {
  validAttempt: boolean;
  criteria: SkillCriterion[];
  strength?: string;
  improvement: string;
  improvementCriterionId: SkillCriterionId;
  examplePhrase: string;
  retryPrompt: string;
  source: "deterministic";
};

const labels: Record<SkillCriterionId, string> = {
  links_to_thread: "Өмнөх яриатай холбоос хийсэн",
  adds_clear_point: "Нэг тодорхой санаа нэмсэн",
  leaves_room: "Үргэлжлүүлэх орон зай үлдээсэн",
};

const connectionSignals = [
  "таны хэлсэн", "таны санаа", "өмнөх санаа", "энэ санаа", "үүнтэй холбо", "холбоод",
  "дээр нь нэм", "үргэлжлүүлээд",
];
const pointSignals = [
  "санаа", "санал", "турш", "эхэл", "хий", "болго", "шийд", "арга", "хувилбар",
  "нэмье", "нэмэх", "миний бодлоор",
];
const roomSignals = [
  "та юу гэж", "юу гэж бод", "болох уу", "ямар санаг", "хамт", "ярилц", "нээлттэй",
  "үргэлжлүүл", "санал байна уу",
];
const invalidSignals = [
  "asdf", "qwer", "lorem ipsum", "test test", "туршилтын текст", "placeholder",
];

const normalize = (value: string) => value.trim().toLocaleLowerCase("mn").replace(/\s+/g, " ");
const hasAny = (value: string, signals: string[]) => signals.some((signal) => value.includes(signal));

function criterion(
  id: SkillCriterionId,
  evidence: CriterionEvidence,
  evidenceText?: string,
): SkillCriterion {
  return { id, label: labels[id], evidence, evidenceText };
}

export function evaluatePracticeResponse(response: string): PracticeEvaluation {
  const normalized = normalize(response);
  const words = normalized.split(/\s+/).filter(Boolean);
  const looksPlaceholder = invalidSignals.some((signal) => normalized.includes(signal)) ||
    /^([^\s])\1{2,}$/.test(normalized);
  const hasConnection = hasAny(normalized, connectionSignals);
  const hasPoint = hasAny(normalized, pointSignals) && words.length >= 3;
  const hasRoom = normalized.includes("?") && hasAny(normalized, roomSignals) ||
    hasAny(normalized, roomSignals) && words.length >= 4;
  const relatedSignalCount = [hasConnection, hasPoint, hasRoom].filter(Boolean).length;
  const validAttempt = words.length >= 3 && !looksPlaceholder && relatedSignalCount > 0;

  if (!validAttempt) {
    return {
      validAttempt: false,
      criteria: SKILL_CRITERION_IDS.map((id) => criterion(id, "not_evaluable")),
      improvement: "Энэ хариултаас зорилтот чадварын нотолгоо хараахан үнэлэгдэхгүй байна.",
      improvementCriterionId: "links_to_thread",
      examplePhrase: "Таны хэлсэнтэй холбоод нэг санаа нэмье.",
      retryPrompt: "Өмнөх хүний хэлсэн санаатай нэг богино холбоосоор эхлээд дахин оролдоорой.",
      source: "deterministic",
    };
  }

  const criteria = [
    criterion(
      "links_to_thread",
      hasConnection ? "present" : "missing",
      hasConnection ? "Өмнөх яриаг нэрлэж эсвэл түүнтэй холбосон." : undefined,
    ),
    criterion(
      "adds_clear_point",
      hasPoint ? "present" : "missing",
      hasPoint ? "Хийж болох нэг санаа эсвэл санал нэмсэн." : undefined,
    ),
    criterion(
      "leaves_room",
      hasRoom ? "present" : "missing",
      hasRoom ? "Нөгөө хүнд хариулах эсвэл үргэлжлүүлэх боломж өгсөн." : undefined,
    ),
  ] satisfies SkillCriterion[];
  const present = criteria.filter((item) => item.evidence === "present");
  const improvementCriterion = criteria.find((item) => item.evidence !== "present") ?? criteria[2];
  const feedbackByCriterion: Record<SkillCriterionId, Pick<PracticeEvaluation, "improvement" | "examplePhrase" | "retryPrompt">> = {
    links_to_thread: {
      improvement: "Өмнөх яриатай нэг тодорхой холбоос хийвэл оролт илүү байгалийн болно.",
      examplePhrase: "Таны хэлсэнтэй холбоод…",
      retryPrompt: "Scene-ээ хэвээр хадгалаад, зөвхөн өмнөх санаатай холбоос хийхэд төвлөрөөрэй.",
    },
    adds_clear_point: {
      improvement: "Холбоосын дараа өөрийн нэг тодорхой санал эсвэл туршилтыг нэмээрэй.",
      examplePhrase: "…дээр нь нэг жижиг туршилт санал болгоё.",
      retryPrompt: "Scene-ээ хэвээр хадгалаад, зөвхөн нэг тодорхой санаа нэмэхэд төвлөрөөрэй.",
    },
    leaves_room: {
      improvement: "Төгсгөлд нөгөө хүнд үргэлжлүүлэх богино орон зай үлдээгээрэй.",
      examplePhrase: "Та үүнийг яаж харж байна?",
      retryPrompt: "Scene-ээ хэвээр хадгалаад, зөвхөн нээлттэй төгсгөл нэмэхэд төвлөрөөрэй.",
    },
  };

  return {
    validAttempt: true,
    criteria,
    strength: present[0]?.evidenceText ?? "Зорилтот ярианд утгатайгаар оролцсон.",
    improvement: feedbackByCriterion[improvementCriterion.id].improvement,
    improvementCriterionId: improvementCriterion.id,
    examplePhrase: feedbackByCriterion[improvementCriterion.id].examplePhrase,
    retryPrompt: feedbackByCriterion[improvementCriterion.id].retryPrompt,
    source: "deterministic",
  };
}

export function demonstratedCriterionCount(evaluation?: Pick<PracticeEvaluation, "criteria"> | null) {
  return evaluation?.criteria.filter((item) => item.evidence === "present").length ?? 0;
}

export function criterionImproved(
  before: PracticeEvaluation,
  after: PracticeEvaluation,
  criterionId: SkillCriterionId,
) {
  const rank: Record<CriterionEvidence, number> = {
    not_evaluable: 0,
    missing: 1,
    partial: 2,
    present: 3,
  };
  const previous = before.criteria.find((item) => item.id === criterionId)?.evidence ?? "not_evaluable";
  const next = after.criteria.find((item) => item.id === criterionId)?.evidence ?? "not_evaluable";
  return rank[next] > rank[previous];
}
