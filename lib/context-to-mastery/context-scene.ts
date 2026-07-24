import type { PracticeContext } from "./practice-context";
import type { Variation } from "../personal-practice/variation-engine";

export type ContextualVariation = Variation & {
  contextFieldsUsed: Array<keyof PracticeContext>;
};

const clean = (value?: string) => value?.trim().replace(/\s+/g, " ").slice(0, 240) || "";

export function contextualizeVariation(
  variation: Variation,
  context: PracticeContext | null,
): ContextualVariation {
  if (!context) return { ...variation, contextFieldsUsed: [] };

  const eventType = clean(context.eventType);
  const decisiveMoment = clean(context.decisiveMoment);
  const fearedMoment = clean(context.fearedMoment);
  const intendedOpening = clean(context.intendedOpening);
  const desiredAction = clean(context.desiredAction);
  const observableFact = clean(context.observableFact);
  const role = clean(context.peopleOrRoles?.[0]);
  const contextFieldsUsed: Array<keyof PracticeContext> = [];

  let environment = variation.environment;
  if (eventType) {
    environment = eventType;
    contextFieldsUsed.push("eventType");
  }

  let character = variation.character;
  if (role) {
    character = role;
    contextFieldsUsed.push("peopleOrRoles");
  }

  const moment = context.entryRoute === "past_repair"
    ? decisiveMoment || observableFact
    : fearedMoment;
  if (moment) contextFieldsUsed.push(context.entryRoute === "past_repair" ? (decisiveMoment ? "decisiveMoment" : "observableFact") : "fearedMoment");

  const cue = moment
    ? `Таны сонгосон мөч: “${moment}”.`
    : `Та ${environment}-д ${character}-тай ярьж байна.`;
  const openingLine = `${cue} ${character} ${variation.tone} өнгөөр өмнөх санаагаа дуусгаад танд орон зай үлдээлээ.`;

  let prompt = variation.prompt;
  if (context.entryRoute === "future_rehearsal" && intendedOpening) {
    prompt = `“${intendedOpening}” гэсэн эхлэлээ ашиглан нэг тодорхой санаа нэмээд, яриаг нээлттэй үлдээгээрэй.`;
    contextFieldsUsed.push("intendedOpening");
  } else if (desiredAction) {
    prompt = `${desiredAction}. Өмнөх яриатай нэг холбоос хийгээд, нөгөө хүнд үргэлжлүүлэх орон зай үлдээгээрэй.`;
    contextFieldsUsed.push("desiredAction");
  } else if (intendedOpening) {
    prompt = `“${intendedOpening}” гэсэн эхлэлээ ашиглан нэг тодорхой санаа нэмээд, яриаг нээлттэй үлдээгээрэй.`;
    contextFieldsUsed.push("intendedOpening");
  }

  let responseFrame = variation.responseFrame;
  if (intendedOpening) {
    responseFrame = `${intendedOpening} → нэг тодорхой санаа → богино нээлттэй төгсгөл`;
    if (!contextFieldsUsed.includes("intendedOpening")) contextFieldsUsed.push("intendedOpening");
  }

  return {
    ...variation,
    environment,
    character,
    openingLine,
    prompt,
    responseFrame,
    contextFieldsUsed,
  };
}
