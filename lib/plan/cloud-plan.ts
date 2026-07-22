"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  LEARNING_PLAN_KEY,
  ONBOARDING_SKIPPED_KEY,
  PREFERENCES_KEY,
  completeLearningPlanDay,
  createLearningPlan,
  persistPlan,
  type LearningPlan,
  type UserPreferences,
} from "./learning-plan";

function readLocal<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) ?? "null") as T | null; } catch { return null; }
}

export function useLearningPlan() {
  const { user, setSyncState } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [ready, setReady] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const loadedUser = useRef<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const localPreferences = readLocal<UserPreferences>(PREFERENCES_KEY);
      const localPlan = readLocal<LearningPlan>(LEARNING_PLAN_KEY);
      setPreferences(localPreferences);
      setPlan(localPlan);
      let skipped = false;
      try { skipped = localStorage.getItem(ONBOARDING_SKIPPED_KEY) === "1"; } catch { /* optional */ }
      setOnboardingOpen(!localPreferences && !skipped);
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!user) {
      loadedUser.current = null;
      return;
    }
    if (!ready || loadedUser.current === user.id) return;
    loadedUser.current = user.id;
    const client = getSupabaseBrowserClient();
    if (!client) return;
    void (async () => {
      const [{ data: cloudPreferences }, { data: cloudPlan }] = await Promise.all([
        client.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle(),
        client.from("learning_plans").select("*").eq("user_id", user.id).in("status", ["active", "completed"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      const nextPreferences = cloudPreferences ? {
        primaryGoal: cloudPreferences.primary_goal,
        primaryChallenge: cloudPreferences.primary_challenge,
        dailyMinutes: cloudPreferences.daily_minutes,
        onboardingCompletedAt: cloudPreferences.onboarding_completed_at,
      } as UserPreferences : preferences;
      const nextPlan = cloudPlan ? cloudPlan.plan_definition as LearningPlan : plan;
      if (nextPreferences) {
        setPreferences(nextPreferences);
        setOnboardingOpen(false);
      }
      if (nextPlan) setPlan(nextPlan);
      persistPlan(nextPreferences, nextPlan);

      if (preferences && plan && !cloudPreferences && !cloudPlan) {
        await Promise.all([
          client.from("user_preferences").upsert({
            user_id: user.id,
            primary_goal: preferences.primaryGoal,
            primary_challenge: preferences.primaryChallenge,
            daily_minutes: preferences.dailyMinutes,
            onboarding_completed_at: preferences.onboardingCompletedAt,
          }, { onConflict: "user_id" }),
          client.from("learning_plans").upsert({
            id: plan.id,
            user_id: user.id,
            status: plan.status,
            start_date: plan.startDate,
            current_day: plan.currentDay,
            plan_definition: plan,
          }, { onConflict: "id" }),
        ]);
      }
    })();
  }, [plan, preferences, ready, user]);

  const saveCloud = useCallback(async (nextPreferences: UserPreferences, nextPlan: LearningPlan, userId = user?.id) => {
    if (!userId) return false;
    const client = getSupabaseBrowserClient();
    if (!client) return false;
    setSyncState("syncing");
    const [{ error: preferencesError }, { error: planError }] = await Promise.all([
      client.from("user_preferences").upsert({
        user_id: userId,
        primary_goal: nextPreferences.primaryGoal,
        primary_challenge: nextPreferences.primaryChallenge,
        daily_minutes: nextPreferences.dailyMinutes,
        onboarding_completed_at: nextPreferences.onboardingCompletedAt,
      }, { onConflict: "user_id" }),
      client.from("learning_plans").upsert({
        id: nextPlan.id,
        user_id: userId,
        status: nextPlan.status,
        start_date: nextPlan.startDate,
        current_day: nextPlan.currentDay,
        plan_definition: nextPlan,
      }, { onConflict: "id" }),
    ]);
    const ok = !preferencesError && !planError;
    setSyncState(ok ? "synced" : "pending");
    return ok;
  }, [setSyncState, user?.id]);

  const finishOnboarding = useCallback((nextPreferences: UserPreferences) => {
    const nextPlan = createLearningPlan(nextPreferences);
    setPreferences(nextPreferences);
    setPlan(nextPlan);
    persistPlan(nextPreferences, nextPlan);
    setOnboardingOpen(false);
    void saveCloud(nextPreferences, nextPlan);
  }, [saveCloud]);

  const skipOnboarding = useCallback(() => {
    try { localStorage.setItem(ONBOARDING_SKIPPED_KEY, "1"); } catch { /* optional */ }
    setOnboardingOpen(false);
  }, []);

  const completeToday = useCallback((ratingBefore: number | null, ratingAfter: number | null) => {
    if (!plan || !preferences) return plan;
    const nextPlan = completeLearningPlanDay(plan, ratingBefore, ratingAfter);
    setPlan(nextPlan);
    persistPlan(preferences, nextPlan);
    void saveCloud(preferences, nextPlan);
    return nextPlan;
  }, [plan, preferences, saveCloud]);

  return { preferences, plan, ready, onboardingOpen, setOnboardingOpen, finishOnboarding, skipOnboarding, completeToday };
}
