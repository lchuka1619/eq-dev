import assert from "node:assert/strict";
import test from "node:test";
import { completeLearningPlanDay, todayKey } from "../lib/plan/learning-plan.ts";
import {
  TARGET_SKILL_ID,
  createVariation,
  decideProgression,
} from "../lib/personal-practice/variation-engine.ts";
import { mergeHydratedPersonalPractice } from "../lib/personal-practice/hydration.ts";

test("controlled variation is deterministic and changes at most two dimensions", () => {
  const first = createVariation("pilot-user-42", "prompted", 2);
  const second = createVariation("pilot-user-42", "prompted", 2);
  assert.deepEqual(first, second);
  assert.equal(first.targetSkillId, TARGET_SKILL_ID);
  assert.ok(first.changedDimensions.length >= 1);
  assert.ok(first.changedDimensions.length <= 2);
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
  assert.equal(decideProgression([stable], "guided").decision, "repeat");
  assert.deepEqual(decideProgression([stable, stable, stable], "guided"), {
    decision: "progress",
    nextStage: "prompted",
  });
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
  }], {
    moments: ["Санаа хэлэх мөч"],
    selected_moment: "Санаа хэлэх мөч",
    fact_text: "Өөр хүн түрүүлж ярьсан.",
    conclusion_text: "Миний санааг сонсохгүй гэж бодсон.",
  });
  assert.equal(hydrated.stage, "prompted");
  assert.equal(hydrated.attempts[0].reflection, "Тайван эхэлж чадсан.");
  assert.equal(hydrated.attempts[0].response, "");
  assert.equal(hydrated.repair?.saveChoice, "cloud");
  assert.equal(hydrated.bridgeAccepted, true);
});
