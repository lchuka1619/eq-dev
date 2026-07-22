"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PracticeSessionRow, ProgressRow } from "@/lib/supabase/types";
import {
  SYNC_QUEUE_KEY,
  calculateStreakFromDates,
  persistLocalProgress,
  type ArenaProgress,
  type DailyProgress,
} from "./local-progress";
import { mergeProgress } from "./merge-progress";

export type SessionInput = Omit<PracticeSessionRow, "user_id">;

type Options = {
  hydrated: boolean;
  daily: DailyProgress;
  arena: ArenaProgress;
  setDaily: (value: DailyProgress) => void;
  setArena: (value: ArenaProgress) => void;
};

function readQueue(): SessionInput[] {
  try {
    return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) ?? "[]") as SessionInput[];
  } catch {
    return [];
  }
}

function writeQueue(queue: SessionInput[]) {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // A failed write is reflected by the in-memory progress and pending UI.
  }
}

function queueSession(input: SessionInput) {
  const queue = readQueue();
  if (!queue.some((item) => item.client_event_id === input.client_event_id)) {
    writeQueue([...queue, input]);
  }
}

async function pushQueue(userId: string): Promise<boolean> {
  const client = getSupabaseBrowserClient();
  if (!client) return false;
  const queue = readQueue();
  if (!queue.length) return true;

  const remaining = [...queue];
  for (const item of queue) {
    const { error } = await client
      .from("practice_sessions")
      .upsert({
        ...item,
        id: item.client_event_id,
        user_id: userId,
        practice_type: item.session_type,
        xp: item.xp_earned,
        practiced_on: item.completed_at.slice(0, 10),
      }, { onConflict: "client_event_id" });
    if (error) return false;
    const index = remaining.findIndex((entry) => entry.client_event_id === item.client_event_id);
    if (index >= 0) remaining.splice(index, 1);
    writeQueue(remaining);
  }
  return true;
}

async function pushAggregate(userId: string, daily: DailyProgress, arena: ArenaProgress) {
  const client = getSupabaseBrowserClient();
  if (!client) return false;
  const completedDates = Array.from(new Set(daily.completedDates)).sort();
  const practicedDates = Array.from(new Set(arena.practicedDates)).sort();
  const { error } = await client.from("user_progress").upsert({
    user_id: userId,
    total_xp: daily.sessions * 10 + arena.xp,
    practice_sessions: daily.sessions,
    arena_sessions: arena.sessions,
    highest_level: arena.highestLevel,
    recovery_strength: arena.recoveryStrength,
    streak: calculateStreakFromDates(completedDates),
    completed_dates: completedDates,
    practiced_dates: practicedDates,
    last_practiced_at: practicedDates.length ? `${practicedDates.at(-1)}T12:00:00.000Z` : null,
  }, { onConflict: "user_id" });
  return !error;
}

function queueLocalHistory(daily: DailyProgress, arena: ArenaProgress) {
  const lastReflection = (() => {
    try { return localStorage.getItem("hariltsaa-last-reflection") ?? ""; } catch { return ""; }
  })();
  daily.completedDates.forEach((date, index) => queueSession({
    client_event_id: crypto.randomUUID(),
    session_type: "daily",
    exercise_id: "local-migration",
    level: null,
    intensity_before: null,
    intensity_after: daily.lastRating || null,
    repetitions: 1,
    xp_earned: 10,
    reflection: index === daily.completedDates.length - 1 ? lastReflection || null : null,
    metadata: { migrated_from_local: true },
    completed_at: `${date}T12:00:00.000Z`,
  }));
  arena.history.forEach((item) => queueSession({
    client_event_id: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.id)
      ? item.id
      : crypto.randomUUID(),
    session_type: "arena",
    exercise_id: "team-lunch",
    level: item.level,
    intensity_before: item.intensityBefore,
    intensity_after: item.intensityAfter,
    repetitions: item.repetitions,
    xp_earned: item.xp,
    reflection: item.reflection || null,
    metadata: { completion: item.completion, migrated_from_local: true },
    completed_at: `${item.date}T12:00:00.000Z`,
  }));
}

export function useCloudProgress({ hydrated, daily, arena, setDaily, setArena }: Options) {
  const { user, setSyncState } = useAuth();
  const initializedUser = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      initializedUser.current = null;
      return;
    }
    if (!hydrated || initializedUser.current === user.id) return;
    initializedUser.current = user.id;
    const client = getSupabaseBrowserClient();
    if (!client) return;

    void (async () => {
      setSyncState("syncing");
      const [{ data: cloudData, error: cloudError }, { data: sessionData, error: sessionError }] = await Promise.all([
        client.from("user_progress").select("*").eq("user_id", user.id).maybeSingle(),
        client.from("practice_sessions").select("*").eq("user_id", user.id).order("completed_at", { ascending: false }).limit(100),
      ]);
      if (cloudError || sessionError) {
        setSyncState("pending");
        return;
      }

      const merged = mergeProgress(
        daily,
        arena,
        cloudData as ProgressRow | null,
        (sessionData ?? []) as PracticeSessionRow[],
      );
      setDaily(merged.daily);
      setArena(merged.arena);
      persistLocalProgress(merged.daily, merged.arena);

      const migrationKey = `hariltsaa-cloud-migrated-${user.id}`;
      let migrated = false;
      try { migrated = localStorage.getItem(migrationKey) === "1"; } catch { /* optional */ }
      if (!migrated) queueLocalHistory(daily, arena);

      const [aggregateOk, queueOk] = await Promise.all([
        pushAggregate(user.id, merged.daily, merged.arena),
        pushQueue(user.id),
      ]);
      if (aggregateOk && queueOk) {
        try { localStorage.setItem(migrationKey, "1"); } catch { /* optional */ }
        setSyncState("synced");
      } else {
        setSyncState("pending");
      }
    })();
  }, [arena, daily, hydrated, setArena, setDaily, setSyncState, user]);

  useEffect(() => {
    if (!user || !hydrated || !readQueue().length) return;
    const retry = () => {
      setSyncState("syncing");
      void pushQueue(user.id).then((ok) => setSyncState(ok ? "synced" : "pending"));
    };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [hydrated, setSyncState, user]);

  const syncSession = useCallback((input: SessionInput, nextDaily: DailyProgress, nextArena: ArenaProgress) => {
    queueSession(input);
    if (!user) return;
    setSyncState("syncing");
    void Promise.all([pushAggregate(user.id, nextDaily, nextArena), pushQueue(user.id)])
      .then(([aggregateOk, queueOk]) => setSyncState(aggregateOk && queueOk ? "synced" : "pending"))
      .catch(() => setSyncState("pending"));
  }, [setSyncState, user]);

  return { syncSession };
}
