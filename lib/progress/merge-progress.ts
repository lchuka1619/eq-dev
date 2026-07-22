import type { PracticeSessionRow, ProgressRow } from "@/lib/supabase/types";
import type { ArenaProgress, ArenaSession, DailyProgress } from "./local-progress";

const union = (...values: string[][]) =>
  Array.from(new Set(values.flat())).sort();

export function mergeProgress(
  daily: DailyProgress,
  arena: ArenaProgress,
  cloud: ProgressRow | null,
  sessions: PracticeSessionRow[],
): { daily: DailyProgress; arena: ArenaProgress } {
  if (!cloud) return { daily, arena };

  const cloudArenaHistory: ArenaSession[] = sessions
    .filter((item) => item.session_type === "arena")
    .map((item) => ({
      id: item.client_event_id,
      date: item.completed_at.slice(0, 10),
      completion: item.metadata.completion === "safe-finish" ? "safe-finish" : "completed",
      level: item.level ?? 0,
      repetitions: item.repetitions,
      xp: item.xp_earned,
      intensityBefore: item.intensity_before ?? 0,
      intensityAfter: item.intensity_after ?? 0,
      reflection: item.reflection ?? "",
    }));
  const history = [...arena.history, ...cloudArenaHistory]
    .filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 20);

  return {
    daily: {
      ...daily,
      sessions: Math.max(daily.sessions, cloud.practice_sessions),
      completedDates: union(daily.completedDates, cloud.completed_dates ?? []),
    },
    arena: {
      ...arena,
      sessions: Math.max(arena.sessions, cloud.arena_sessions),
      xp: Math.max(arena.xp, Math.max(0, cloud.total_xp - Math.max(daily.sessions, cloud.practice_sessions) * 10)),
      highestLevel: Math.max(arena.highestLevel, cloud.highest_level),
      recoveryStrength: Math.max(arena.recoveryStrength, cloud.recovery_strength),
      practicedDates: union(arena.practicedDates, cloud.practiced_dates ?? []),
      history,
    },
  };
}
