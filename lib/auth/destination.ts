export const AUTH_DESTINATIONS = [
  "/today",
  "/journey",
  "/progress",
  "/profile",
  "/practice/personal?route=past_repair",
  "/practice/personal?route=future_rehearsal",
  "/practice/personal?route=daily_skill_loop",
] as const;

export type AuthDestination = (typeof AUTH_DESTINATIONS)[number];

export function safeAuthDestination(value: string | null | undefined): AuthDestination {
  return AUTH_DESTINATIONS.includes(value as AuthDestination) ? value as AuthDestination : "/today";
}

export function buildAuthCallbackUrl(origin: string, destination: string) {
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", safeAuthDestination(destination));
  return callback.toString();
}
