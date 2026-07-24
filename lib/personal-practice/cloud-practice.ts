"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PersonalAttempt, PersonalPracticeState, RepairDraft } from "./persistence";
import {
  mergeHydratedPersonalPractice,
  type CloudAttempt,
  type CloudJourney,
  type CloudRepair,
} from "./hydration";

export async function syncPersonalPractice(
  userId: string,
  state: PersonalPracticeState,
  attempt: PersonalAttempt,
) {
  const client = getSupabaseBrowserClient();
  if (!client) return false;
  const repair = state.repair;
  const repairPayload = repair?.saveChoice === "cloud" ? {
    id: state.journeyId,
    user_id: userId,
    target_skill_id: state.targetSkillId,
    moments: repair.moments,
    selected_moment: repair.selectedMoment,
    fact_text: repair.fact,
    conclusion_text: repair.conclusion,
  } : null;
  const { error: journeyError } = await client.from("personal_practice_journeys").upsert({
    id: state.journeyId,
    user_id: userId,
    target_skill_id: state.targetSkillId,
    current_stage: state.stage,
    state: {
        attempt_count: state.attempts.length,
        bridge_accepted: state.bridgeAccepted,
        surprise_opt_in: state.surpriseOptIn,
    },
  }, { onConflict: "id" });
  if (journeyError) return false;
  if (repairPayload) {
    const { error: repairError } = await client
      .from("past_event_repairs")
      .upsert(repairPayload, { onConflict: "id" });
    if (repairError) return false;
  }
  const { error } = await client.from("personal_practice_attempts").upsert({
    id: attempt.id,
    journey_id: state.journeyId,
    user_id: userId,
    target_skill_id: state.targetSkillId,
    variation_id: attempt.variation.id,
    variation_seed: attempt.variation.seed,
    stage: attempt.stage,
    changed_dimensions: attempt.variation.changedDimensions,
    anxiety_before: attempt.anxietyBefore,
    anxiety_after: attempt.anxietyAfter,
    completed: attempt.completed,
    safe_finished: attempt.safeFinished,
    used_hint: attempt.usedHint,
    reflection: attempt.reflection || null,
    decision: attempt.decision,
    renderer: attempt.variation.renderer,
    media_asset_id: attempt.variation.renderer === "image_audio" ? "ideation-event-calm-v1" : null,
    media_skipped: attempt.variation.renderer === "text_voice",
    completed_at: attempt.completedAt,
  }, { onConflict: "id" });
  return !error;
}

export async function deleteCloudRepair(userId: string, journeyId: string) {
  const client = getSupabaseBrowserClient();
  if (!client) return false;
  const { error } = await client.from("past_event_repairs").delete().eq("id", journeyId).eq("user_id", userId);
  return !error;
}

export async function syncBridgeChoice(userId: string, state: PersonalPracticeState, accepted: boolean) {
  const client = getSupabaseBrowserClient();
  if (!client) return false;
  const { error } = await client.from("personal_practice_journeys").update({
    state: {
      attempt_count: state.attempts.length,
      bridge_accepted: accepted,
      surprise_opt_in: state.surpriseOptIn,
    },
  }).eq("id", state.journeyId).eq("user_id", userId);
  return !error;
}

export async function hydratePersonalPractice(
  userId: string,
  local: PersonalPracticeState,
): Promise<PersonalPracticeState> {
  const client = getSupabaseBrowserClient();
  if (!client) return local;
  const { data: journey, error: journeyError } = await client
    .from("personal_practice_journeys")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (journeyError || !journey) return local;

  const [{ data: attempts, error: attemptsError }, { data: repair, error: repairError }] = await Promise.all([
    client
      .from("personal_practice_attempts")
      .select("*")
      .eq("journey_id", journey.id)
      .eq("user_id", userId)
      .order("completed_at", { ascending: true }),
    client
      .from("past_event_repairs")
      .select("*")
      .eq("id", journey.id)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  if (attemptsError || repairError) return local;
  return mergeHydratedPersonalPractice(
    local,
    journey as CloudJourney,
    (attempts ?? []) as CloudAttempt[],
    repair as CloudRepair | null,
  );
}

export type { RepairDraft };
