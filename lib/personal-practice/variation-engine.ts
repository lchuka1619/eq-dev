export const TARGET_SKILL_ID = "idea-entry.clear-contribution.v1" as const;

export type RehearsalStage =
  | "guided"
  | "prompted"
  | "independent"
  | "light-surprise"
  | "connected-rehearsal";

export type VariationDimension =
  | "environment"
  | "character"
  | "tone"
  | "promptSupport"
  | "complication";

export type Variation = {
  id: string;
  seed: string;
  targetSkillId: typeof TARGET_SKILL_ID;
  stage: RehearsalStage;
  environment: string;
  character: string;
  tone: string;
  promptSupport: string;
  complication: string;
  changedDimensions: VariationDimension[];
  openingLine: string;
  prompt: string;
  responseFrame: string;
};

export type AttemptEvidence = {
  stage: RehearsalStage;
  completed: boolean;
  safeFinished: boolean;
  usedHint: boolean;
  anxietyBefore: number;
  anxietyAfter: number;
};

export type ProgressDecision = "repeat" | "soften" | "progress";

const stages: RehearsalStage[] = [
  "guided",
  "prompted",
  "independent",
  "light-surprise",
  "connected-rehearsal",
];

const pools = {
  environment: ["бага хурлын өрөө", "эвентийн кофе завсарлага", "онлайн ideation уулзалт"],
  character: ["танил хамтрагч", "өөр хэлтсийн оролцогч", "эвентийн чиглүүлэгч"],
  tone: ["тайван, сонирхсон", "түргэн хэмнэлтэй", "бага зэрэг эргэлзсэн"],
  promptSupport: [
    "“Сонссоноо холбоод → санаагаа нэг өгүүлбэрээр → нэг асуулт”",
    "“Энэ санаатай холбоод би … гэж санал болгоё. Та юу гэж харж байна?”",
    "Зөвхөн эхний 3–5 үгээ урьдчилан сонго.",
  ],
  complication: ["гэнэтийн зүйлгүй", "өөр хүн ижил санаа түрүүлж хэлэв", "чамаас жишээ асуув"],
} satisfies Record<VariationDimension, string[]>;

const base = {
  environment: pools.environment[0],
  character: pools.character[0],
  tone: pools.tone[0],
  promptSupport: pools.promptSupport[0],
  complication: pools.complication[0],
};

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function nextRandom(state: number) {
  let value = state + 0x6d2b79f5;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return { state: value >>> 0, value: ((value ^ (value >>> 14)) >>> 0) / 4294967296 };
}

function select<T>(items: readonly T[], state: number) {
  const random = nextRandom(state);
  return { state: random.state, value: items[Math.floor(random.value * items.length)] };
}

export function createVariation(seed: string, stage: RehearsalStage, attemptIndex = 0): Variation {
  let state = hashSeed(`${seed}:${stage}:${attemptIndex}:${TARGET_SKILL_ID}`);
  const dimensions = Object.keys(pools) as VariationDimension[];
  const changeCount = stage === "guided" ? (attemptIndex === 0 ? 0 : 1) : attemptIndex % 3 === 2 ? 2 : 1;
  const changedDimensions: VariationDimension[] = [];
  while (changedDimensions.length < changeCount) {
    const picked = select(dimensions, state);
    state = picked.state;
    if (!changedDimensions.includes(picked.value)) changedDimensions.push(picked.value);
  }

  const result = { ...base };
  for (const dimension of changedDimensions) {
    const alternatives = pools[dimension].filter((item) => item !== base[dimension]);
    const picked = select(alternatives, state);
    state = picked.state;
    result[dimension] = picked.value;
  }

  const responseFrame = stage === "guided"
    ? "“Таны хэлсэнтэй холбоод нэг санаа нэмье. ____. Энэ чиглэл боломжтой санагдаж байна уу?”"
    : stage === "prompted"
      ? "Холбох үг → нэг тодорхой санаа → богино асуулт"
      : "Өөрийн үгээр тайван орж, нэг санаагаа тодорхой хэл.";

  return {
    id: `${TARGET_SKILL_ID}:${stage}:${hashSeed(`${seed}:${attemptIndex}`).toString(36)}`,
    seed,
    targetSkillId: TARGET_SKILL_ID,
    stage,
    ...result,
    changedDimensions,
    openingLine: `Та ${result.environment}-д ${result.character}-тай ярьж байна. Тэр ${result.tone} өнгөөр: “Энэ удаагийн санаануудаас алийг нь эхэлж турших вэ?” гэж асуулаа.`,
    prompt: result.complication === base.complication
      ? "Ярианд тайван орж, нэг санаагаа богино хэлээрэй."
      : `${result.complication}. Ижил чадвараа ашиглан ярианд ороорой.`,
    responseFrame,
  };
}

export function decideProgression(
  history: AttemptEvidence[],
  currentStage: RehearsalStage,
): { decision: ProgressDecision; nextStage: RehearsalStage } {
  const recent = history.slice(-3);
  if (recent.length >= 2 && recent.slice(-2).every((item) =>
    item.safeFinished || item.anxietyAfter >= 8 || item.anxietyAfter - item.anxietyBefore >= 2
  )) {
    return {
      decision: "soften",
      nextStage: stages[Math.max(0, stages.indexOf(currentStage) - 1)],
    };
  }

  const stable = recent.length === 3 && recent.every((item) =>
    item.completed && !item.safeFinished && !item.usedHint && item.anxietyAfter <= item.anxietyBefore + 1
  );
  if (stable) {
    return {
      decision: "progress",
      nextStage: stages[Math.min(stages.length - 1, stages.indexOf(currentStage) + 1)],
    };
  }
  return { decision: "repeat", nextStage: currentStage };
}
