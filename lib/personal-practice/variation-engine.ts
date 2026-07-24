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

export type SceneRenderer =
  | "text_voice"
  | "image_audio"
  | "pov_video"
  | "video_360"
  | "vr_interactive";

export type DecisionMoment = {
  id: string;
  targetSkillId: typeof TARGET_SKILL_ID;
  goal: string;
  successSignal: string;
};

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
  renderer: SceneRenderer;
  decisionMoment: DecisionMoment;
};

export type AttemptEvidence = {
  stage: RehearsalStage;
  completed: boolean;
  safeFinished: boolean;
  usedHint: boolean;
  anxietyBefore: number;
  anxietyAfter: number;
  completedAt?: string;
  variationId?: string;
  decision?: ProgressDecision;
};

export type ProgressDecision = "repeat" | "soften" | "progress" | "consolidate" | "pause";

const stages: RehearsalStage[] = [
  "guided",
  "prompted",
  "independent",
  "light-surprise",
  "connected-rehearsal",
];

const pools = {
  environment: ["багийн ideation уулзалт", "эвентийн кофе завсарлага", "эвент рүү явах автобус"],
  character: ["танил хамтрагч", "өөр хэлтсийн оролцогч", "хажууд суусан оролцогч"],
  tone: ["тайван, сонирхсон", "түргэн хэмнэлтэй", "бага зэрэг эргэлзсэн"],
  promptSupport: [
    "“Сонссоноо холбоод → санаагаа нэг өгүүлбэрээр → нэг асуулт”",
    "“Энэ санаатай холбоод би … гэж санал болгоё. Та юу гэж харж байна?”",
    "Зөвхөн эхний 3–5 үгээ урьдчилан сонго.",
  ],
  complication: ["гэнэтийн зүйлгүй", "өөр хүн ижил санаа түрүүлж хэлэв", "бүтцийг нь товчлохыг хүсэв"],
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

export function createVariation(
  seed: string,
  stage: RehearsalStage,
  attemptIndex = 0,
  renderer: SceneRenderer = "text_voice",
): Variation {
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
    renderer,
    decisionMoment: {
      id: "join-idea-thread-v1",
      targetSkillId: TARGET_SKILL_ID,
      goal: "Өмнөх санаатай холбоод нэг тодорхой санал нэмэх",
      successSignal: "Холбоос + нэг санаа + үргэлжлүүлэх орон зай",
    },
  };
}

export function decideProgression(
  history: AttemptEvidence[],
  currentStage: RehearsalStage,
  options: { allowSurprise?: boolean } = {},
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
  const latest = history.at(-1);
  if (latest && (latest.safeFinished || latest.anxietyAfter >= 8)) {
    return { decision: "pause", nextStage: currentStage };
  }

  const previous = history.at(-2);
  const latestStable = latest &&
    latest.completed &&
    !latest.safeFinished &&
    !latest.usedHint &&
    latest.anxietyAfter <= latest.anxietyBefore + 1;
  if (previous?.decision === "progress" && latestStable) {
    return { decision: "consolidate", nextStage: currentStage };
  }

  const stable = recent.length === 3 && recent.every((item) =>
    item.completed && !item.safeFinished && !item.usedHint && item.anxietyAfter <= item.anxietyBefore + 1
  );
  const distinctDates = new Set(recent.map((item) => item.completedAt?.slice(0, 10)).filter(Boolean));
  const distinctVariants = new Set(recent.map((item) => item.variationId).filter(Boolean));
  if (stable && distinctDates.size >= 2 && distinctVariants.size >= 2) {
    const proposedStage = stages[Math.min(stages.length - 1, stages.indexOf(currentStage) + 1)];
    const nextStage = proposedStage === "light-surprise" && (!options.allowSurprise || !canUseLightSurprise(history))
      ? currentStage
      : proposedStage;
    return {
      decision: nextStage === currentStage ? "consolidate" : "progress",
      nextStage,
    };
  }
  return { decision: "repeat", nextStage: currentStage };
}

export function canUseLightSurprise(history: AttemptEvidence[]) {
  const recent = history.slice(-3);
  if (recent.length < 3) return false;
  return recent.every((item) =>
    item.completed &&
    !item.safeFinished &&
    item.anxietyAfter < 8 &&
    item.anxietyAfter <= item.anxietyBefore + 1
  );
}

export function safeStageForIntensity(stage: RehearsalStage, intensity: number): RehearsalStage {
  return stage === "light-surprise" && intensity >= 8 ? "independent" : stage;
}

export function evaluatePracticeResponse(response: string) {
  const normalized = response.trim().toLocaleLowerCase("mn");
  const hasConnection = ["холбоод", "таны хэлсэн", "энэ санаа", "нэмж"].some((phrase) => normalized.includes(phrase));
  const hasQuestion = normalized.includes("?");
  const concise = normalized.length <= 220;
  return {
    positive: hasConnection
      ? "Өмнөх санаатай холбоод ярианд орсон нь ойлгомжтой боллоо."
      : concise
        ? "Санаагаа богино, сонсоход хялбар хэллээ."
        : "Ярианд орж, санаагаа илэрхийлж чадлаа.",
    improve: hasQuestion
      ? "Одоо гол саналаа эхний өгүүлбэрт арай тодорхой байрлуулаарай."
      : "Нөгөө хүнд үргэлжлүүлэх орон зай өгөх нэг богино асуулт нэмээрэй.",
  };
}
