export type SyncState = "local" | "syncing" | "synced" | "pending";

export type ProgressRow = {
  user_id: string;
  total_xp: number;
  practice_sessions: number;
  arena_sessions: number;
  highest_level: number;
  recovery_strength: number;
  streak: number;
  completed_dates: string[];
  practiced_dates: string[];
  last_practiced_at: string | null;
};

export type PracticeSessionRow = {
  id?: string;
  client_event_id: string;
  user_id: string;
  session_type: "daily" | "arena";
  exercise_id: string | null;
  level: number | null;
  intensity_before: number | null;
  intensity_after: number | null;
  repetitions: number;
  xp_earned: number;
  reflection: string | null;
  metadata: Record<string, unknown>;
  completed_at: string;
  plan_id?: string | null;
  plan_day?: number | null;
  self_rating_before?: number | null;
  self_rating_after?: number | null;
};
