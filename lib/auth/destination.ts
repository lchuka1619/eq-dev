export const APP_ROUTES = ["/today", "/journey", "/progress", "/profile"] as const;

export type AppRoute = (typeof APP_ROUTES)[number];

export function safeAuthDestination(value: string | null | undefined): AppRoute {
  return APP_ROUTES.includes(value as AppRoute) ? value as AppRoute : "/today";
}

export function buildAuthCallbackUrl(origin: string, pathname: string) {
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", safeAuthDestination(pathname));
  return callback.toString();
}
