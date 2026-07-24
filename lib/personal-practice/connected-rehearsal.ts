export const CONNECTED_REHEARSAL_KEY = "eq-connected-rehearsal-v1";
export const CONNECTED_REHEARSAL_CAP_SECONDS = 10 * 60;

export type ConnectedMoment = {
  id: string;
  title: string;
  characterLine: string;
  prompt: string;
  recovery?: string;
};

export const connectedMoments: ConnectedMoment[] = [
  { id: "arrive", title: "Эвентэд ирэх", characterLine: "Сайн уу, манай жижиг бүлэгт нэгдээрэй.", prompt: "Нэг өгүүлбэрээр мэндэлж, энд байгаагаа мэдэгдээрэй." },
  { id: "listen", title: "Сэдвийг сонсох", characterLine: "Бид хэрэглэгчийн эхний туршлагыг яаж хялбарчлах талаар ярьж байна.", prompt: "Сонссоноо нэг холбоос өгүүлбэрээр баталгаажуулаарай." },
  { id: "enter", title: "Ярианд орох", characterLine: "Өөр өнцөг байгаа болов уу?", prompt: "Нэг тодорхой санаагаа богино хэлээрэй." },
  { id: "clarify", title: "Жишээ нэмэх", characterLine: "Үүнийг нэг жижиг жишээгээр хэлж болох уу?", prompt: "Санаагаа нэг бодит жишээгээр тодруулаарай." },
  { id: "overlap", title: "Санаа давхцах", characterLine: "Би ч бас яг ийм санал хэлэх гэж байлаа.", prompt: "Ижил хэсгийг зөвшөөрөөд, өөрийн нэмэх ялгааг тайван хэлээрэй.", recovery: "“Тийм ээ, ижил суурьтай байна. Би нэг жижиг ялгаа нэмье…”" },
  { id: "recover", title: "Гацалтаас сэргэх", characterLine: "Та санаагаа үргэлжлүүлэх үү?", prompt: "Recovery phrase ашиглаад гол санаандаа буцаарай.", recovery: "“Би нэг мөч бодоод, гол санаагаа товч хэлье…”" },
  { id: "close", title: "Яриаг холбоотой дуусгах", characterLine: "Дараагийн алхмаар алийг нь турших вэ?", prompt: "Нэг дараагийн алхам эсвэл богино асуултаар дуусгаарай." },
];

export type ConnectedRehearsalState = {
  id: string;
  journeyId: string;
  status: "idle" | "active" | "paused" | "completed" | "safe-finish";
  currentMoment: number;
  completedMomentIds: string[];
  localResponses: Record<string, string>;
  intensityBefore: number;
  intensityAfter: number;
  usedRecovery: boolean;
  pauseCount: number;
  elapsedSeconds: number;
  startedAt: string | null;
  completedAt: string | null;
};

export function createConnectedRehearsal(journeyId: string): ConnectedRehearsalState {
  return {
    id: crypto.randomUUID(),
    journeyId,
    status: "idle",
    currentMoment: 0,
    completedMomentIds: [],
    localResponses: {},
    intensityBefore: 4,
    intensityAfter: 4,
    usedRecovery: false,
    pauseCount: 0,
    elapsedSeconds: 0,
    startedAt: null,
    completedAt: null,
  };
}

export function readConnectedRehearsal(journeyId: string) {
  try {
    const value = JSON.parse(localStorage.getItem(CONNECTED_REHEARSAL_KEY) ?? "null") as ConnectedRehearsalState | null;
    return value?.journeyId === journeyId ? value : createConnectedRehearsal(journeyId);
  } catch {
    return createConnectedRehearsal(journeyId);
  }
}

export function writeConnectedRehearsal(state: ConnectedRehearsalState) {
  try { localStorage.setItem(CONNECTED_REHEARSAL_KEY, JSON.stringify(state)); } catch { /* local state remains */ }
}

export function connectedTimeRemaining(elapsedSeconds: number) {
  return Math.max(0, CONNECTED_REHEARSAL_CAP_SECONDS - elapsedSeconds);
}
