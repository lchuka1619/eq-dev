export const ACTIVE_PRACTICE_KEY = "eq-active-practice-v1";

export type ActivePractice = {
  href:
    | "/practice/personal?route=past_repair"
    | "/practice/personal?route=future_rehearsal"
    | "/practice/personal?route=daily_skill_loop";
  label: string;
  startedAt: string;
};

export function readActivePractice(): ActivePractice | null {
  try {
    const value = JSON.parse(localStorage.getItem(ACTIVE_PRACTICE_KEY) ?? "null") as ActivePractice | null;
    if (!value || ![
      "/practice/personal?route=past_repair",
      "/practice/personal?route=future_rehearsal",
      "/practice/personal?route=daily_skill_loop",
    ].includes(value.href)) return null;
    return value;
  } catch {
    return null;
  }
}

export function writeActivePractice(active: ActivePractice) {
  try { localStorage.setItem(ACTIVE_PRACTICE_KEY, JSON.stringify(active)); } catch { /* navigation still works */ }
}

export function clearActivePractice() {
  try { localStorage.removeItem(ACTIVE_PRACTICE_KEY); } catch { /* optional marker */ }
}
