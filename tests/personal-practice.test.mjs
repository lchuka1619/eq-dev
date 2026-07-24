import assert from "node:assert/strict";
import test from "node:test";
import { completeLearningPlanDay, todayKey } from "../lib/plan/learning-plan.ts";
import { buildAuthCallbackUrl, safeAuthDestination } from "../lib/auth/destination.ts";
import {
  TARGET_SKILL_ID,
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
    },
  ], "prompted");
  assert.deepEqual(result, { decision: "consolidate", nextStage: "prompted" });
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
    state: { bridge_accepted: true },
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
  assert.equal(hydrated.attempts[0].variation.renderer, "image_audio");
  assert.equal(hydrated.repair?.saveChoice, "cloud");
  assert.equal(hydrated.bridgeAccepted, true);
  assert.equal(hydrated.surpriseOptIn, false);
});
