export const LEARNING_EVENT_NAMES = [
  "today_recommendation_viewed",
  "entry_route_selected",
  "context_capture_completed",
  "context_capture_skipped",
  "practice_attempt_submitted",
  "practice_attempt_validity",
  "rubric_evaluated",
  "focused_retry_started",
  "focused_retry_completed",
  "controlled_variant_started",
  "mastery_decision",
  "level_down_used",
  "safe_finish_used",
  "real_life_bridge_offered",
  "later_day_confirmation",
] as const;

export type LearningEventName = typeof LEARNING_EVENT_NAMES[number];
export type LearningEventValue = string | number | boolean | null;

const safeKeys = new Set([
  "entry_route",
  "target_skill_id",
  "support_level",
  "variant_id",
  "evaluation_source",
  "criteria_present",
  "valid_attempt",
  "decision",
  "save_choice",
  "changed_dimension_count",
  "focused_criterion_id",
  "confirmed_across_days",
  "has_context",
]);

const enumValues: Record<string, Set<string>> = {
  entry_route: new Set(["past_repair", "future_rehearsal", "daily_skill_loop"]),
  support_level: new Set(["guided", "prompted", "independent", "light-surprise", "connected-rehearsal"]),
  evaluation_source: new Set(["deterministic", "ai", "hybrid"]),
  decision: new Set(["repeat", "soften", "progress", "consolidate", "pause"]),
  save_choice: new Set(["none", "device", "cloud"]),
  focused_criterion_id: new Set(["links_to_thread", "adds_clear_point", "leaves_room"]),
};

const safeIdentifier = /^[a-z0-9][a-z0-9._:-]{0,119}$/i;

export function sanitizeLearningProperties(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, LearningEventValue> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (!safeKeys.has(key)) continue;
    if (typeof item === "boolean" && ["valid_attempt", "confirmed_across_days", "has_context"].includes(key)) {
      result[key] = item;
      continue;
    }
    if (typeof item === "number" && ["criteria_present", "changed_dimension_count"].includes(key)) {
      result[key] = Math.max(0, Math.min(3, Math.round(item)));
      continue;
    }
    if (typeof item !== "string") continue;
    if (enumValues[key]?.has(item)) result[key] = item;
    if (["target_skill_id", "variant_id"].includes(key) && safeIdentifier.test(item)) result[key] = item;
  }
  return result;
}

export function trackLearningEvent(
  event: LearningEventName,
  properties: Record<string, LearningEventValue> = {},
) {
  if (typeof window === "undefined") return;
  const key = "eq-learning-analytics-id-v1";
  let anonymousId = "";
  try {
    anonymousId = window.localStorage.getItem(key) ?? crypto.randomUUID();
    window.localStorage.setItem(key, anonymousId);
  } catch {
    anonymousId = crypto.randomUUID();
  }
  void fetch("/api/beta-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event,
      anonymousId,
      sessionId: "",
      properties: sanitizeLearningProperties(properties),
    }),
    keepalive: true,
  }).catch(() => undefined);
}
