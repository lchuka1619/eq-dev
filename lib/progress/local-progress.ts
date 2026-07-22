export const DAILY_PROGRESS_KEY = "hariltsaa-progress-v1";
export const ARENA_PROGRESS_KEY = "hariltsaa-arena-progress-v1";
export const SYNC_QUEUE_KEY = "hariltsaa-cloud-sync-queue-v1";

export type DailyProgress = {
  completedDates: string[];
  sessions: number;
  lastRating: number;
};

export type ArenaSession = {
  id: string;
  date: string;
  completion: "completed" | "safe-finish";
  level: number;
  repetitions: number;
  xp: number;
  intensityBefore: number;
  intensityAfter: number;
  reflection: string;
};

export type ArenaProgress = {
  sessions: number;
  meaningfulRepetitions: number;
  recoveryStrength: number;
  xp: number;
  highestLevel: number;
  practicedDates: string[];
  recoveryDates: string[];
  lastIntensityBefore: number;
  lastIntensityAfter: number;
  lastCompletion: "completed" | "safe-finish" | null;
  history: ArenaSession[];
};

export function persistLocalProgress(daily: DailyProgress, arena: ArenaProgress) {
  try {
    localStorage.setItem(DAILY_PROGRESS_KEY, JSON.stringify(daily));
    localStorage.setItem(ARENA_PROGRESS_KEY, JSON.stringify(arena));
  } catch {
    // State remains in memory when browser storage is unavailable.
  }
}

export function calculateStreakFromDates(dates: string[]): number {
  const done = new Set(dates);
  const cursor = new Date();
  const key = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  if (!done.has(key(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (done.has(key(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}
