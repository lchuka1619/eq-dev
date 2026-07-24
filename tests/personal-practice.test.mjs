import assert from "node:assert/strict";
import test from "node:test";
import { completeLearningPlanDay, todayKey } from "../lib/plan/learning-plan.ts";
import { buildAuthCallbackUrl, safeAuthDestination } from "../lib/auth/destination.ts";
import {
  clearActivePractice,
  readActivePractice,
  writeActivePractice,
} from "../lib/practice/active-practice.ts";
import {
  contextForStorage,
  contextHasMeaningfulDetail,
  dailySkillContext,
  normalizePracticeContext,
} from "../lib/context-to-mastery/practice-context.ts";
import { contextualizeVariation } from "../lib/context-to-mastery/context-scene.ts";
import {
  criterionImproved,
  evaluatePracticeResponse,
} from "../lib/context-to-mastery/skill-rubric.ts";
import { buildMasterySummary } from "../lib/context-to-mastery/mastery-summary.ts";
import {
  TARGET_SKILL_ID,
  canUseLightSurprise,
  createVariation,
  decideProgression,
  safeStageForIntensity,
} from "../lib/personal-practice/variation-engine.ts";

test("auth destination allows only canonical app routes", () => {
  assert.equal(safeAuthDestination("/progress"), "/progress");
  assert.equal(safeAuthDestination("/today"), "/today");
  assert.equal(safeAuthDestination("https://evil.example"), "/today");
  assert.equal(safeAuthDestination("//evil.example"), "/today");
  assert.equal(safeAuthDestination("/auth/callback"), "/today");
  assert.equal(new URL(buildAuthCallbackUrl("https://eq-dev-xi.vercel.app", "/")).searchParams.get("next"), "/today");
  assert.equal(new URL(buildAuthCallbackUrl("https://eq-dev-xi.vercel.app", "/progress")).searchParams.get("next"), "/progress");
});

test("active practice resume marker accepts only canonical Personal Practice routes", () => {
  const values = new Map();
  const originalStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  try {
    const active = {
      href: "/practice/personal?route=past_repair",
      label: "Past Event Repair",
      startedAt: "2026-07-24T10:00:00.000Z",
    };
    writeActivePractice(active);
    assert.deepEqual(readActivePractice(), active);
    values.set("eq-active-practice-v1", JSON.stringify({ ...active, href: "https://evil.example" }));
    assert.equal(readActivePractice(), null);
    clearActivePractice();
    assert.equal(readActivePractice(), null);
  } finally {
    if (originalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalStorage;
  }
});

test("PracticeContext normalizes sensitive short input and honours no-save choice", () => {
  const context = normalizePracticeContext({
    entryRoute: "future_rehearsal",
    eventType: "  Багийн   хурал ",
    peopleOrRoles: [" хамтрагч ", "", " багийн ахлах "],
    fearedMoment: "  Хоёр хүн зэрэг ярьсны дараа   санаагаа оруулах ",
    intendedOpening: " Таны хэлсэнтэй холбоод нэг санаа нэмье. ",
    intensity: 14,
    saveChoice: "none",
  });
  assert.equal(context.eventType, "Багийн хурал");
  assert.deepEqual(context.peopleOrRoles, ["хамтрагч", "багийн ахлах"]);
  assert.equal(context.intensity, 10);
  assert.equal(contextHasMeaningfulDetail(context), true);
  assert.equal(contextForStorage(context), null);
});

test("Daily Skill Loop provides a context-light shared contract", () => {
  const context = dailySkillContext();
  assert.equal(context.entryRoute, "daily_skill_loop");
  assert.equal(contextHasMeaningfulDetail(context), true);
  assert.equal(context.saveChoice, "device");
});
import { mergeHydratedPersonalPractice } from "../lib/personal-practice/hydration.ts";
import { isPastEventPilotEnabled, recommendTodayRoute } from "../lib/personal-practice/today-router.ts";
import { ideationEventMedia, mediaAssetForIntensity } from "../lib/personal-practice/media-assets.ts";
import {
  CONNECTED_REHEARSAL_CAP_SECONDS,
  connectedMoments,
  connectedTimeRemaining,
} from "../lib/personal-practice/connected-rehearsal.ts";

test("controlled variation is deterministic and changes at most two dimensions", () => {
  const first = createVariation("pilot-user-42", "prompted", 2);
  const second = createVariation("pilot-user-42", "prompted", 2);
  assert.deepEqual(first, second);
  assert.equal(first.targetSkillId, TARGET_SKILL_ID);
  assert.ok(first.changedDimensions.length >= 1);
  assert.ok(first.changedDimensions.length <= 2);
});

test("skill rubric evaluates positive, partial, empty, and unrelated responses", () => {
  const complete = evaluatePracticeResponse(
    "Таны хэлсэнтэй холбоод нэг жижиг туршилт хийе. Та юу гэж бодож байна?",
  );
  assert.equal(complete.validAttempt, true);
  assert.deepEqual(complete.criteria.map((item) => item.evidence), ["present", "present", "present"]);

  const partial = evaluatePracticeResponse("Таны хэлсэнтэй холбоод нэг санаа нэмье.");
  assert.equal(partial.validAttempt, true);
  assert.deepEqual(partial.criteria.map((item) => item.evidence), ["present", "present", "missing"]);
  assert.equal(partial.improvementCriterionId, "leaves_room");

  for (const invalid of ["", "asdf qwer zxcv", "Өнөөдөр бороо орж байна"]) {
    const result = evaluatePracticeResponse(invalid);
    assert.equal(result.validAttempt, false);
    assert.ok(result.criteria.every((item) => item.evidence === "not_evaluable"));
  }
});

test("focused retry keeps one improvement target and reports criterion change", () => {
  const before = evaluatePracticeResponse("Таны хэлсэнтэй холбоод нэг санаа нэмье.");
  const after = evaluatePracticeResponse(
    "Таны хэлсэнтэй холбоод нэг санаа нэмье. Та юу гэж бодож байна?",
  );
  assert.equal(before.improvementCriterionId, "leaves_room");
  assert.match(before.retryPrompt, /Scene-ээ хэвээр хадгалаад/);
  assert.equal(criterionImproved(before, after, before.improvementCriterionId), true);
  assert.equal(after.improvementCriterionId, "leaves_room");
});

test("context-to-scene transformation is deterministic and preserves the learning target", () => {
  const base = createVariation("context-seed", "prompted", 1);
  const context = normalizePracticeContext({
    entryRoute: "future_rehearsal",
    eventType: "Байгууллагын ideation event",
    peopleOrRoles: ["багийн ахлах"],
    fearedMoment: "Хоёр хүн зэрэг ярьсны дараа санаагаа оруулах",
    intendedOpening: "Таны хэлсэнтэй холбоод нэг санаа нэмье.",
    saveChoice: "none",
  });
  const first = contextualizeVariation(base, context);
  const second = contextualizeVariation(base, context);

  assert.deepEqual(first, second);
  assert.equal(first.targetSkillId, base.targetSkillId);
  assert.equal(first.stage, base.stage);
  assert.equal(first.renderer, base.renderer);
  assert.deepEqual(first.decisionMoment, base.decisionMoment);
  assert.deepEqual(first.changedDimensions, base.changedDimensions);
  assert.match(first.openingLine, /Хоёр хүн зэрэг ярьсны дараа санаагаа оруулах/);
  assert.equal(first.environment, "Байгууллагын ideation event");
  assert.equal(first.character, "багийн ахлах");
  assert.match(first.prompt, /Таны хэлсэнтэй холбоод нэг санаа нэмье/);
});

test("changing one context field changes its scene cue without changing controlled variation", () => {
  const base = createVariation("context-change-seed", "guided", 0);
  const common = {
    entryRoute: "future_rehearsal",
    eventType: "Багийн хурал",
    peopleOrRoles: ["хамтрагч"],
    intendedOpening: "Нэг санаа нэмье.",
    saveChoice: "device",
  };
  const first = contextualizeVariation(base, { ...common, fearedMoment: "Эхний санааны дараа" });
  const second = contextualizeVariation(base, { ...common, fearedMoment: "Асуулт ирсний дараа" });

  assert.notEqual(first.openingLine, second.openingLine);
  assert.equal(first.prompt, second.prompt);
  assert.equal(first.targetSkillId, second.targetSkillId);
  assert.equal(first.complication, second.complication);
  assert.deepEqual(first.decisionMoment, second.decisionMoment);
  assert.deepEqual(first.changedDimensions, second.changedDimensions);
});

test("Past repair facts shape the scene while a missing context leaves the variation intact", () => {
  const base = createVariation("past-context-seed", "guided", 2);
  const past = contextualizeVariation(base, {
    entryRoute: "past_repair",
    eventType: "Санаа боловсруулах уулзалт",
    peopleOrRoles: ["төслийн ахлагч"],
    decisiveMoment: "Миний өмнөх хүн ярьж дууссан",
    observableFact: "Би гараа өргөсөн боловч үг хэлээгүй",
    desiredAction: "Нэг холбоос хэлээд саналаа товч нэмэх",
    saveChoice: "device",
  });
  const untouched = contextualizeVariation(base, null);

  assert.equal(past.environment, "Санаа боловсруулах уулзалт");
  assert.equal(past.character, "төслийн ахлагч");
  assert.match(past.openingLine, /Миний өмнөх хүн ярьж дууссан/);
  assert.match(past.prompt, /Нэг холбоос хэлээд саналаа товч нэмэх/);
  assert.equal(past.targetSkillId, base.targetSkillId);
  assert.deepEqual(untouched, { ...base, contextFieldsUsed: [] });
});

test("renderer changes presentation without changing the decision moment or skill", () => {
  const text = createVariation("renderer-seed", "guided", 0, "text_voice");
  const media = createVariation("renderer-seed", "guided", 0, "image_audio");
  assert.equal(text.targetSkillId, media.targetSkillId);
  assert.deepEqual(text.decisionMoment, media.decisionMoment);
  assert.equal(text.renderer, "text_voice");
  assert.equal(media.renderer, "image_audio");
});

test("graded media metadata is explicit and high intensity falls back to text", () => {
  assert.equal(ideationEventMedia.locale, "mn-MN");
  assert.equal(ideationEventMedia.qaStatus, "approved");
  assert.ok(ideationEventMedia.image.alt.length > 20);
  assert.equal(mediaAssetForIntensity(8)?.id, "ideation-event-calm-v1");
  assert.equal(mediaAssetForIntensity(9), null);
});

test("connected rehearsal has seven moments and a ten-minute cap", () => {
  assert.equal(connectedMoments.length, 7);
  assert.ok(connectedMoments.some((item) => item.recovery));
  assert.equal(CONNECTED_REHEARSAL_CAP_SECONDS, 600);
  assert.equal(connectedTimeRemaining(599), 1);
  assert.equal(connectedTimeRemaining(601), 0);
});

test("guided pilot exposes at least three deterministic variants", () => {
  const variants = [0, 1, 2].map((index) => createVariation("guided-seed", "guided", index));
  assert.equal(new Set(variants.map((item) => item.id)).size, 3);
  assert.ok(variants.every((item) => item.stage === "guided"));
  assert.ok(variants.every((item) => item.changedDimensions.length <= 1));
});

test("prompted pilot exposes at least three variants without changing the skill", () => {
  const variants = [0, 1, 2].map((index) => createVariation("prompted-seed", "prompted", index));
  assert.equal(new Set(variants.map((item) => item.id)).size, 3);
  assert.ok(variants.every((item) => item.targetSkillId === TARGET_SKILL_ID));
  assert.ok(variants.every((item) => item.changedDimensions.length >= 1 && item.changedDimensions.length <= 2));
});

test("progression requires three stable attempts instead of one rating", () => {
  const stable = {
    stage: "guided",
    completed: true,
    safeFinished: false,
    usedHint: false,
    anxietyBefore: 5,
    anxietyAfter: 4,
    validAttempt: true,
    demonstratedCriteria: 2,
  };
  assert.equal(decideProgression([{ ...stable, completedAt: "2026-07-23T10:00:00Z", variationId: "a" }], "guided").decision, "repeat");
  assert.deepEqual(decideProgression([
    { ...stable, completedAt: "2026-07-23T10:00:00Z", variationId: "a" },
    { ...stable, completedAt: "2026-07-23T11:00:00Z", variationId: "b" },
    { ...stable, completedAt: "2026-07-24T10:00:00Z", variationId: "c" },
  ], "guided"), {
    decision: "progress",
    nextStage: "prompted",
  });
});

test("same-day repetition consolidates but does not progress mastery", () => {
  const stable = {
    stage: "guided",
    completed: true,
    safeFinished: false,
    usedHint: false,
    anxietyBefore: 5,
    anxietyAfter: 4,
    validAttempt: true,
    demonstratedCriteria: 2,
  };
  assert.deepEqual(decideProgression([
    { ...stable, completedAt: "2026-07-24T09:00:00Z", variationId: "a" },
    { ...stable, completedAt: "2026-07-24T10:00:00Z", variationId: "b" },
    { ...stable, completedAt: "2026-07-24T11:00:00Z", variationId: "c" },
  ], "guided"), { decision: "repeat", nextStage: "guided" });
});

test("safe finish pauses and high intensity blocks light surprise", () => {
  const paused = decideProgression([{
    stage: "prompted",
    completed: false,
    safeFinished: true,
    usedHint: true,
    anxietyBefore: 8,
    anxietyAfter: 8,
    completedAt: "2026-07-24T10:00:00Z",
    variationId: "pause",
  }], "prompted");
  assert.deepEqual(paused, { decision: "pause", nextStage: "prompted" });
  assert.equal(safeStageForIntensity("light-surprise", 8), "independent");
});

test("first stable attempt after progress is a consolidation", () => {
  const result = decideProgression([
    {
      stage: "guided",
      completed: true,
      safeFinished: false,
      usedHint: false,
      anxietyBefore: 5,
      anxietyAfter: 4,
      decision: "progress",
      completedAt: "2026-07-23T10:00:00Z",
      variationId: "a",
      validAttempt: true,
      demonstratedCriteria: 2,
    },
    {
      stage: "prompted",
      completed: true,
      safeFinished: false,
      usedHint: false,
      anxietyBefore: 4,
      anxietyAfter: 4,
      completedAt: "2026-07-24T10:00:00Z",
      variationId: "b",
      validAttempt: true,
      demonstratedCriteria: 2,
    },
  ], "prompted");
  assert.deepEqual(result, { decision: "consolidate", nextStage: "prompted" });
});

test("completion without valid rubric evidence cannot advance mastery", () => {
  const invalid = {
    stage: "guided",
    completed: true,
    validAttempt: false,
    demonstratedCriteria: 0,
    safeFinished: false,
    usedHint: false,
    anxietyBefore: 4,
    anxietyAfter: 3,
  };
  assert.deepEqual(decideProgression([
    { ...invalid, completedAt: "2026-07-22T10:00:00Z", variationId: "a" },
    { ...invalid, completedAt: "2026-07-23T10:00:00Z", variationId: "b" },
    { ...invalid, completedAt: "2026-07-24T10:00:00Z", variationId: "c" },
  ], "guided"), { decision: "repeat", nextStage: "guided" });
});

test("Light Surprise requires two distinct Prompted variants and recent safety", () => {
  const usable = {
    stage: "prompted",
    completed: true,
    validAttempt: true,
    demonstratedCriteria: 2,
    safeFinished: false,
    usedHint: false,
    anxietyBefore: 5,
    anxietyAfter: 4,
  };
  assert.equal(canUseLightSurprise([
    { ...usable, variationId: "prompted-a" },
    { ...usable, variationId: "prompted-a" },
  ]), false);
  assert.equal(canUseLightSurprise([
    { ...usable, variationId: "prompted-a" },
    { ...usable, variationId: "prompted-b" },
  ]), true);
  assert.equal(canUseLightSurprise([
    { ...usable, variationId: "prompted-a" },
    { ...usable, variationId: "prompted-b" },
    { ...usable, stage: "independent", variationId: "overload", anxietyAfter: 9 },
  ]), false);
});

test("mastery summary explains variants, criteria, and later-day confirmation without duplicate inflation", () => {
  const evaluation = evaluatePracticeResponse(
    "Таны хэлсэнтэй холбоод нэг жижиг туршилт хийе. Та юу гэж бодож байна?",
  );
  const attempt = (id, variantIndex, completedAt) => ({
    id,
    stage: "prompted",
    completed: true,
    validAttempt: true,
    demonstratedCriteria: 3,
    safeFinished: false,
    usedHint: false,
    anxietyBefore: 5,
    anxietyAfter: 4,
    variation: createVariation("mastery-seed", "prompted", variantIndex),
    response: "",
    reflection: "",
    decision: "repeat",
    completedAt,
    evaluation,
  });
  const first = attempt("attempt-a", 0, "2026-07-23T10:00:00.000Z");
  const second = attempt("attempt-b", 1, "2026-07-24T10:00:00.000Z");
  const summary = buildMasterySummary({
    journeyId: "journey",
    targetSkillId: TARGET_SKILL_ID,
    stage: "independent",
    context: null,
    repair: null,
    attempts: [first, first, second],
    bridgeAccepted: null,
    bridge: {
      id: "bridge",
      status: "none",
      offeredAt: null,
      respondedAt: null,
      didIt: null,
      intensityBefore: null,
      intensityAfter: null,
      reflection: "",
    },
    surpriseOptIn: false,
  });

  assert.equal(summary.usableAttemptCount, 2);
  assert.equal(summary.distinctVariantCount, 2);
  assert.equal(summary.confirmedAcrossDays, true);
  assert.ok(summary.criteria.every((criterion) => criterion.stable));
  assert.match(summary.nextRecommendation, /Light Surprise/);
});

test("Today router deterministically selects repair, future, or daily", () => {
  assert.equal(recommendTodayRoute({
    accumulatedIntensity: 7,
    upcomingEvent: true,
    availableEnergy: 5,
  }).route, "past_repair");
  assert.equal(recommendTodayRoute({
    accumulatedIntensity: 3,
    upcomingEvent: true,
    availableEnergy: 5,
  }).route, "future_rehearsal");
  assert.equal(recommendTodayRoute({
    accumulatedIntensity: 3,
    upcomingEvent: false,
    availableEnergy: 2,
  }).route, "daily_skill_loop");
});

test("feature flag can restore the existing Sprint 6 Today path", () => {
  const previous = process.env.NEXT_PUBLIC_PAST_EVENT_PILOT;
  process.env.NEXT_PUBLIC_PAST_EVENT_PILOT = "false";
  assert.equal(isPastEventPilotEnabled(), false);
  if (previous === undefined) delete process.env.NEXT_PUBLIC_PAST_EVENT_PILOT;
  else process.env.NEXT_PUBLIC_PAST_EVENT_PILOT = previous;
});

test("two overloaded attempts soften without cloning the old exercise", () => {
  const overloaded = {
    stage: "prompted",
    completed: false,
    safeFinished: true,
    usedHint: true,
    anxietyBefore: 7,
    anxietyAfter: 9,
  };
  assert.deepEqual(decideProgression([overloaded, overloaded], "prompted"), {
    decision: "soften",
    nextStage: "guided",
  });
  assert.notEqual(
    createVariation("soften-seed", "guided", 3).id,
    createVariation("soften-seed", "prompted", 2).id,
  );
});

test("repeating practice on the same date does not inflate plan day or streak input", () => {
  const plan = {
    id: "plan-test",
    status: "active",
    startDate: todayKey(),
    currentDay: 1,
    days: Array.from({ length: 7 }, (_, index) => ({
      day: index + 1,
      lessonIndex: index,
      title: `Day ${index + 1}`,
      reason: "Test",
      skill: "Clear contribution",
    })),
    completions: [],
  };
  const once = completeLearningPlanDay(plan, 5, 4);
  const repeated = completeLearningPlanDay(once, 5, 3);
  assert.equal(once.currentDay, 2);
  assert.equal(repeated.currentDay, 2);
  assert.equal(repeated.completions.length, 1);
});

test("cloud hydration restores stage, reflection, repair and bridge without response text", () => {
  const cloudEvaluation = evaluatePracticeResponse(
    "Таны хэлсэнтэй холбоод нэг жижиг туршилт хийе.",
  );
  const local = {
    journeyId: "local-empty",
    targetSkillId: TARGET_SKILL_ID,
    stage: "guided",
    repair: null,
    attempts: [],
    bridgeAccepted: null,
    bridge: {
      id: "bridge-local",
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
  const hydrated = mergeHydratedPersonalPractice(local, {
    id: "cloud-journey",
    target_skill_id: TARGET_SKILL_ID,
    current_stage: "prompted",
    state: {
      bridge_accepted: true,
      evaluations: {
        "attempt-1": {
          evaluation: cloudEvaluation,
          focusedCriterionId: "leaves_room",
        },
      },
    },
  }, [{
    id: "attempt-1",
    variation_id: "variant-1",
    variation_seed: "cloud-seed",
    stage: "guided",
    anxiety_before: 6,
    anxiety_after: 4,
    completed: true,
    safe_finished: false,
    used_hint: false,
    reflection: "Тайван эхэлж чадсан.",
    decision: "progress",
    completed_at: "2026-07-24T10:00:00.000Z",
    renderer: "image_audio",
    media_asset_id: "ideation-event-calm-v1",
    media_skipped: false,
  }], {
    moments: ["Санаа хэлэх мөч"],
    selected_moment: "Санаа хэлэх мөч",
    fact_text: "Өөр хүн түрүүлж ярьсан.",
    conclusion_text: "Миний санааг сонсохгүй гэж бодсон.",
  });
  assert.equal(hydrated.stage, "prompted");
  assert.equal(hydrated.attempts[0].reflection, "Тайван эхэлж чадсан.");
  assert.equal(hydrated.attempts[0].response, "");
  assert.deepEqual(hydrated.attempts[0].evaluation, cloudEvaluation);
  assert.equal(hydrated.attempts[0].validAttempt, true);
  assert.equal(hydrated.attempts[0].demonstratedCriteria, 2);
  assert.equal(hydrated.attempts[0].focusedCriterionId, "leaves_room");
  assert.equal(hydrated.attempts[0].variation.renderer, "image_audio");
  assert.equal(hydrated.repair?.saveChoice, "cloud");
  assert.equal(hydrated.bridgeAccepted, true);
  assert.equal(hydrated.surpriseOptIn, false);
});
