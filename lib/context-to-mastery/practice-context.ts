export type PracticeEntryRoute = "past_repair" | "future_rehearsal" | "daily_skill_loop";
export type ContextSaveChoice = "none" | "device" | "cloud";

export type PracticeContext = {
  entryRoute: PracticeEntryRoute;
  eventType?: string;
  decisiveMoment?: string;
  observableFact?: string;
  conclusion?: string;
  desiredAction?: string;
  peopleOrRoles?: string[];
  fearedMoment?: string;
  intendedOpening?: string;
  intensity?: number;
  saveChoice: ContextSaveChoice;
};

const compact = (value?: string) => value?.trim().replace(/\s+/g, " ").slice(0, 500) || undefined;

export function normalizePracticeContext(context: PracticeContext): PracticeContext {
  return {
    entryRoute: context.entryRoute,
    eventType: compact(context.eventType),
    decisiveMoment: compact(context.decisiveMoment),
    observableFact: compact(context.observableFact),
    conclusion: compact(context.conclusion),
    desiredAction: compact(context.desiredAction),
    peopleOrRoles: context.peopleOrRoles?.map(compact).filter((value): value is string => Boolean(value)).slice(0, 5),
    fearedMoment: compact(context.fearedMoment),
    intendedOpening: compact(context.intendedOpening),
    intensity: context.intensity === undefined ? undefined : Math.max(0, Math.min(10, Math.round(context.intensity))),
    saveChoice: context.saveChoice,
  };
}

export function dailySkillContext(saveChoice: ContextSaveChoice = "device"): PracticeContext {
  return {
    entryRoute: "daily_skill_loop",
    eventType: "Өдөр тутмын багийн яриа",
    peopleOrRoles: ["хамтрагч"],
    desiredAction: "Өмнөх яриатай холбож нэг тодорхой санаа нэмэх",
    intensity: 3,
    saveChoice,
  };
}

export function contextHasMeaningfulDetail(context: PracticeContext) {
  if (context.entryRoute === "daily_skill_loop") return true;
  return Boolean(
    context.decisiveMoment ||
    context.observableFact ||
    context.fearedMoment ||
    context.intendedOpening ||
    context.desiredAction,
  );
}

export function contextForStorage(context: PracticeContext | null) {
  return context?.saveChoice === "none" ? null : context;
}
