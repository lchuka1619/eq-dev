export type TodayRoute = "past_repair" | "future_rehearsal" | "daily_skill_loop";

export type ReadinessCheck = {
  accumulatedIntensity: number;
  upcomingEvent: boolean;
  availableEnergy: number;
};

export type TodayRecommendation = {
  route: TodayRoute;
  reason: string;
  title: string;
  action: string;
};

export const TODAY_ROUTER_KEY = "eq-today-practice-router-v1";

export function recommendTodayRoute(readiness: ReadinessCheck): TodayRecommendation {
  if (readiness.accumulatedIntensity >= 6) {
    return {
      route: "past_repair",
      title: "Нэг өмнөх мөчийг аюулгүй засварлах",
      reason: "Өмнөх ижил нөхцөлийн нөлөөг нэг жижиг мөчөөр салгаж үзэх нь өнөөдөр илүү тохиромжтой.",
      action: "Past Event Repair эхлэх",
    };
  }
  if (readiness.upcomingEvent) {
    return {
      route: "future_rehearsal",
      title: "Ойрын эвентэд хэлэх үгээ давтах",
      reason: "Ойрын тодорхой нөхцөл байгаа тул ижил чадварыг хөнгөн хувилбараар бэлдэнэ.",
      action: "Future rehearsal эхлэх",
    };
  }
  return {
    route: "daily_skill_loop",
    title: "Өнөөдрийн богино чадварын давталт",
    reason: readiness.availableEnergy <= 3
      ? "Өнөөдөр ачаалал багатай, танил бүтэцтэй дасгал сонголоо."
      : "Тодорхой эвентгүй үед өдөр тутмын нэг чадвараа тогтвортой давтах нь тохиромжтой.",
    action: "Өнөөдрийн дасгалыг эхлүүлэх",
  };
}

export function readTodayRouterState(): {
  readiness: ReadinessCheck;
  selectedRoute: TodayRoute | null;
} | null {
  try {
    return JSON.parse(localStorage.getItem(TODAY_ROUTER_KEY) ?? "null");
  } catch {
    return null;
  }
}

export function writeTodayRouterState(value: {
  readiness: ReadinessCheck;
  selectedRoute: TodayRoute | null;
}) {
  try { localStorage.setItem(TODAY_ROUTER_KEY, JSON.stringify(value)); } catch { /* optional */ }
}

export function isPastEventPilotEnabled() {
  return process.env.NEXT_PUBLIC_PAST_EVENT_PILOT !== "false";
}
