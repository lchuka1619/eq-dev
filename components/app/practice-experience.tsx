"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import { TodayPracticeRouter } from "@/components/personal-practice/today-practice-router";
import { useCloudProgress } from "@/lib/progress/cloud-progress";
import { useLearningPlan } from "@/lib/plan/cloud-plan";
import { isPastEventPilotEnabled } from "@/lib/personal-practice/today-router";
import { todayKey } from "@/lib/plan/learning-plan";

type VoicePhase = "ready" | "respond" | "feedback" | "retry" | "complete";
type ArenaPhase = "idle" | "checkin" | "brief" | "scene" | "complete";
type ArenaCompletion = "completed" | "safe-finish";
type ArenaAttemptPhase = "respond" | "feedback" | "retry" | "retry-feedback";
type VoiceFeedback = { positive: string; improve: string };
type MicroLesson = {
  skill: string;
  title: string;
  goal: string;
  line: string;
  placeholder: string;
  keywords: string[];
};
type Progress = {
  completedDates: string[];
  sessions: number;
  lastRating: number;
};
type ArenaSessionRecord = {
  id: string;
  date: string;
  completion: ArenaCompletion;
  level: number;
  repetitions: number;
  xp: number;
  intensityBefore: number;
  intensityAfter: number;
  reflection: string;
};
type BetaEventName = "arena_started" | "scene_audio_played" | "response_recorded" | "transcript_confirmed" | "feedback_shown" | "retry_completed" | "control_used" | "arena_completed" | "beta_feedback_submitted";
type BetaEvent = {
  id: string;
  name: BetaEventName;
  createdAt: string;
  sessionId: string;
  properties: Record<string, string | number | boolean | null>;
};
type ArenaProgress = {
  sessions: number;
  meaningfulRepetitions: number;
  recoveryStrength: number;
  xp: number;
  highestLevel: number;
  practicedDates: string[];
  recoveryDates: string[];
  lastIntensityBefore: number;
  lastIntensityAfter: number;
  lastCompletion: ArenaCompletion | null;
  history: ArenaSessionRecord[];
};

export type LegacyRoleOption = {
  label: string;
  feedback: string;
  helpful: boolean;
};

export type LegacyScenario = {
  id: string;
  category: string;
  title: string;
  description: string;
  counterpart: string;
  prompt: string;
  options: LegacyRoleOption[];
};

type ArenaBeat = {
  speaker: string;
  tone: string;
  line: string;
  prompt: string;
  hint: string;
  responses: string[];
};

const exercises = [
  {
    name: "Идэвхтэй сонсох",
    skill: "Сонсох",
    instruction:
      "Яриаг таслахгүй сонсоод, сонссоноо нэг өгүүлбэрээр өөрийн үгээр буцааж хэл.",
    example: "“Таны хувьд хугацаа хамгийн их санаа зовоож байна гэж ойлголоо. Зөв үү?”",
    reflection: "Та зөвлөгөө өгөхөөсөө өмнө ойлгосноо баталгаажуулж чадсан уу?",
  },
  {
    name: "Тодорхой хүсэлт тавих",
    skill: "Тодорхой байдал",
    instruction:
      "Нөхцөл, өөрийн хэрэгцээ, хүсэж буй дараагийн алхмаа тус бүр нэг өгүүлбэрээр хэл.",
    example: "“Тайлан өнөөдөр хэрэгтэй байна. 16:00 гэхэд эхний хувилбарыг илгээж болох уу?”",
    reflection: "Таны хүсэлт хугацаа, үйлдэл хоёрын хувьд тодорхой байсан уу?",
  },
  {
    name: "Тайван дахин хэлэх",
    skill: "Өөрийгөө удирдах",
    instruction:
      "Хариулахаас өмнө 3 удаа удаан амьсгал. Дүгнэлт биш, ажигласан баримтаар өгүүлбэрээ эхэл.",
    example: "“Сүүлийн хоёр уулзалтад шийдвэр өөрчлөгдсөн. Аль хувилбарыг баримтлахаа тохиръё.”",
    reflection: "Та хүнийг биш, болсон үйл явдлыг ярьж чадсан уу?",
  },
];

export const legacyScenarios: LegacyScenario[] = [
  {
    id: "work",
    category: "АЖЛЫН ХАРИЛЦАА",
    title: "Санал зөрөлдөөнийг тайван шийдэх",
    description: "Хамтрагч тань таны санааг хурлын үеэр шууд няцаалаа.",
    counterpart: "“Энэ санаа бодитой биш. Ингэж цаг алдах хэрэггүй.”",
    prompt: "Та яаж хариулах вэ?",
    options: [
      {
        label: "“Яагаад бодитой биш гэж үзэж байгааг тодруулж болох уу?”",
        feedback: "Сайн сонголт. Та хамгаалах байр суурь руу орохгүйгээр шалтгааныг тодрууллаа.",
        helpful: true,
      },
      {
        label: "“Та миний санааг хэзээ ч сонсдоггүй.”",
        feedback: "‘Хэзээ ч’ гэх ерөнхийлөл нөгөө хүнийг хамгаалалтад оруулж магадгүй. Нэг тодорхой баримтаас эхлээрэй.",
        helpful: false,
      },
      {
        label: "“За тэгвэл өөрөө мэд.”",
        feedback: "Яриаг хаах нь түр амар мэт боловч асуудлыг үлдээнэ. Нэг нээлттэй асуулт тавиад үзээрэй.",
        helpful: false,
      },
    ],
  },
  {
    id: "home",
    category: "ГЭР БҮЛИЙН ХАРИЛЦАА",
    title: "Хэцүү яриаг зөөлөн эхлүүлэх",
    description: "Ойр хүн тань тохирсон ажлаа дахин хийгээгүй байна.",
    counterpart: "“Би завгүй байсныг чи мэдэж байгаа шүү дээ.”",
    prompt: "Та яаж хариулах вэ?",
    options: [
      {
        label: "“Завгүй байсныг ойлгож байна. Гэхдээ энэ ажил үлдэхээр би ачаалалтай болдог. Одоо хэзээ хийхээ тохиръё.”",
        feedback: "Маш сайн. Ойлгож байгаагаа хэлээд, өөрийн мэдрэмж ба тодорхой хүсэлтээ салгаж илэрхийллээ.",
        helpful: true,
      },
      {
        label: "“Чи үргэлж л шалтаг хэлдэг.”",
        feedback: "Шошголох нь гол асуудлаас холдуулдаг. Нөхцөл → нөлөө → хүсэлт гэсэн дарааллаар туршаарай.",
        helpful: false,
      },
      {
        label: "Дуугүй өнгөрөөнө.",
        feedback: "Түр зөрчилгүй өнгөрөх ч бухимдал хуримтлагдаж болно. Богино, тодорхой хүсэлт илүү аюулгүй.",
        helpful: false,
      },
    ],
  },
  {
    id: "boundary",
    category: "ХУВИЙН ХИЛ ХЯЗГААР",
    title: "Эелдгээр “үгүй” гэж хэлэх",
    description: "Танд цаг байхгүй ч найз тань яаралтай тусламж хүсэв.",
    counterpart: "“Энэ орой миний ажлыг чи л амжуулж өгч чадна.”",
    prompt: "Та яаж хариулах вэ?",
    options: [
      {
        label: "“Өнөө орой амжуулах боломжгүй. Харин маргааш 20 минут хамт хараад өгч чадна.”",
        feedback: "Сайн хил хязгаар. Боломжгүй зүйлээ товч хэлээд, хийж чадах бодит хувилбарыг санал болголоо.",
        helpful: true,
      },
      {
        label: "“За яах вэ, явуулаад өг.”",
        feedback: "Хүсээгүй ч зөвшөөрөх нь дараа нь бухимдал үүсгэнэ. Боломжгүйгээ тайлбар ихгүйгээр хэлж болно.",
        helpful: false,
      },
      {
        label: "“Надаас дандаа юм гуйхаа боль.”",
        feedback: "Хил хязгаар хэрэгтэй ч энэ хэлбэр харилцааг хурцатгана. Одоогийн хүсэлтэд төвлөрөөрэй.",
        helpful: false,
      },
    ],
  },
];

const arenaLevels = [
  { level: 1, name: "Хөтлүүлсэн", detail: "Бэлэн хариу, тайван хэмнэл" },
  { level: 2, name: "Санамжтай", detail: "Өгүүлбэрийн эхлэл, нэг follow-up" },
  { level: 3, name: "Бага зэрэг гэнэтийн", detail: "Нэрээр дуудах, сэдэв солих" },
];

const teamLunchBeats: ArenaBeat[] = [
  {
    speaker: "Сараа",
    tone: "Найрсаг хамтрагч",
    line: "Сайн уу, энд суу. Өглөөний ажил ямар байв?",
    prompt: "Мэндлээд нэг л баримт нэмээрэй.",
    hint: "Төгс сонирхолтой хариу хэрэггүй. ‘Сайн, баярлалаа. Өглөө …’ гэж эхэлж болно.",
    responses: [
      "Сайн, баярлалаа. Өглөө тайлангаа дуусгалаа.",
      "Сайн уу. Жаахан завгүй байсан ч одоо гайгүй.",
      "Сайн. Та нарын өглөө ямар байв?",
    ],
  },
  {
    speaker: "Тэмүүлэн",
    tone: "Хурдан ярьдаг хамтрагч",
    line: "Өнөөдөр манай талд нэлээд завгүй байна аа.",
    prompt: "Өмнөх өгүүлбэрээс нэг холбоос аваарай.",
    hint: "Нээлттэй асуулт хамгийн амархан гүүр болно: ‘Яг аль ажил нь хамгийн их завгүй байна?’",
    responses: [
      "Яг аль ажил нь хамгийн их завгүй байна?",
      "Манай талд ч бас адилхан байна. Танай deadline хэзээ вэ?",
      "Тэгвэл өдрийн хоол жаахан амралт болж байна уу?",
    ],
  },
  {
    speaker: "Болд",
    tone: "Багийн ахлах",
    line: "Чи өнөөдөр их чимээгүй байна. Бүх зүйл зүгээр үү?",
    prompt: "Тайлбар ихгүйгээр тайван хариулаад, яриаг буцааж холбоорой.",
    hint: "Recovery: ‘Зүгээр ээ, эхлээд сонсоод сууж байлаа.’ Дараа нь нэг асуулт нэмж болно.",
    responses: [
      "Зүгээр ээ, эхлээд сонсоод сууж байлаа.",
      "Бүх зүйл зүгээр. Та нарын яриаг сонсож байлаа.",
      "Зүгээр ээ. Өмнөх сэдэв дээр нэг юм нэмэхэд…",
    ],
  },
];

const emptyProgress: Progress = {
  completedDates: [],
  sessions: 0,
  lastRating: 0,
};

const emptyArenaProgress: ArenaProgress = {
  sessions: 0,
  meaningfulRepetitions: 0,
  recoveryStrength: 0,
  xp: 0,
  highestLevel: 0,
  practicedDates: [],
  recoveryDates: [],
  lastIntensityBefore: 0,
  lastIntensityAfter: 0,
  lastCompletion: null,
  history: [],
};

const defaultVideoId = "aDMtx5ivKK0";
const microLessons: MicroLesson[] = [
  { skill: "ИДЭВХТЭЙ СОНСОХ", title: "Мэдрэмжийг нь буцааж хэл", goal: "Утга ба мэдрэмжийг нэрлээд нэг нээлттэй асуулт тавих", line: "Өнөөдөр төлөвлөсөн ажлаа амжуулаагүй болохоор жаахан сэтгэлээр уначихлаа.", placeholder: "Сэтгэлээр унасан юм байна. Яг аль хэсэг нь хамгийн хэцүү байв?", keywords: ["сэтгэл", "урам", "унасан", "хэцүү"] },
  { skill: "ТОДОРХОЙ ХҮСЭЛТ", title: "Хүсэлтээ хугацаатай хэл", goal: "Хэрэгцээ, үйлдэл, хугацааг нэг богино хүсэлтэд оруулах", line: "Тайлангийн эхний хувилбар хэзээ хэрэгтэйг сайн ойлгосонгүй.", placeholder: "Надад өнөөдөр хэрэгтэй байна. 16:00 гэхэд эхний хувилбарыг илгээж болох уу?", keywords: ["хэрэгтэй", "илгээ", "цаг", "өнөөдөр", "маргааш"] },
  { skill: "ХИЛ ХЯЗГААР", title: "Эелдгээр үгүй гэж хэл", goal: "Боломжгүйгээ товч хэлээд хийж чадах хувилбар санал болгох", line: "Энэ орой миний ажлыг чи л амжуулж өгч чадна.", placeholder: "Өнөө орой боломжгүй. Харин маргааш 20 минут хамт хараад өгч чадна.", keywords: ["боломжгүй", "чадахгүй", "харин", "маргааш", "болно"] },
  { skill: "САНАЛ ЗӨРӨЛДӨӨН", title: "Хамгаалахын өмнө тодруул", goal: "Маргалдахгүйгээр шалтгааныг нь асуух", line: "Энэ санаа бодитой биш. Ингэж цаг алдах хэрэггүй.", placeholder: "Яг аль хэсгийг бодитой биш гэж үзэж байгааг тодруулж болох уу?", keywords: ["яагаад", "аль", "юу", "тодруул", "үзэж"] },
  { skill: "СЭТГЭЛИЙН ДЭМЖЛЭГ", title: "Шийдэл өгөхгүйгээр дэмж", goal: "Мэдрэмжийг нь хүлээн зөвшөөрөөд сонсох орон зай өгөх", line: "Сүүлийн үед бүх юм давхацчихсан, үнэхээр ядарч байна.", placeholder: "Их ачаалалтай, ядарсан юм байна. Яг одоо хамгийн хүнд нь юу байна?", keywords: ["ядар", "ачаалал", "хүнд", "сонс", "ойлгож"] },
  { skill: "УУЧЛАЛТ", title: "Тайлбаргүйгээр хариуцлага хүлээ", goal: "Үйлдлээ нэрлэж, нөлөөг зөвшөөрөөд засах алхам хэлэх", line: "Чи өчигдрийн уулзалтад ирээгүй, би ганцаараа хүлээсэн.", placeholder: "Ирээгүйдээ уучлаарай. Чамайг хүлээлгэсэн байна. Өнөөдөр дахин цаг тохиръё.", keywords: ["уучла", "хүлээлгэ", "алдаа", "дахин", "тохир"] },
  { skill: "ТАЙВАН FEEDBACK", title: "Баримт, нөлөө, хүсэлт хэл", goal: "Хүнийг шүүхгүйгээр болсон зүйл ба хүсэлтээ тодорхой хэлэх", line: "Би яриаг чинь хоёр удаа тасалчихсан юм шиг байна.", placeholder: "Хоёр удаа таслахад санаагаа дуусгахад хэцүү байлаа. Дуустал минь сонсож болох уу?", keywords: ["хоёр", "тасал", "хэцүү", "сонс", "дуус"] },
];

function evaluateResponse(value: string, lesson: MicroLesson): VoiceFeedback {
  const text = value.toLocaleLowerCase("mn-MN");
  const hasMeaning = lesson.keywords.some((word) => text.includes(word));
  const hasEmotion = ["сэтгэл", "урам", "хэцүү", "санаа", "уначих"].some((word) => text.includes(word));
  const hasQuestion = ["юу", "яаж", "аль", "ямар", "хэзээ", "хаана", "?"].some((word) => text.includes(word));

  const positive = hasMeaning && hasEmotion
    ? "Та болсон зүйл болон мэдрэмжийг хоёуланг нь анзаарлаа."
    : hasMeaning
      ? "Та ярианы гол утгыг зөв барьж авлаа."
      : hasQuestion
        ? "Та яриаг үргэлжлүүлэх нээлттэй орон зай гаргалаа."
        : "Та шууд хариулах зоригтой алхам хийлээ.";

  const improve = !hasMeaning
    ? `Дасгалын зорилгод ойртуулаарай: ${lesson.goal}.`
    : !hasQuestion && [0, 3, 4, 6].includes(microLessons.indexOf(lesson))
      ? "Төгсгөлд нь нэг нээлттэй асуулт нэмээрэй."
      : "Сайн бүтэцтэй байна. Одоо санаагаа нэг өгүүлбэрт илүү товч хэлээрэй.";

  return { positive, improve };
}

function evaluateArenaResponse(value: string, beat: ArenaBeat): VoiceFeedback {
  const normalized = value.trim().toLocaleLowerCase("mn-MN");
  const connected = beat.responses.some((example) => {
    const words = example.toLocaleLowerCase("mn-MN").match(/[а-яөүё]+/gi) ?? [];
    return words.some((word) => word.length > 4 && normalized.includes(word));
  });
  const hasQuestion = /[?？]|(юу|яаж|аль|ямар|хэзээ|хаана)/i.test(normalized);
  return {
    positive: connected
      ? "Та өмнөх яриатай холбоотой, ойлгомжтой нэг өгүүлбэрээр оролцлоо."
      : "Та дуугүй өнгөрөхийн оронд ярианд оролцох бодит оролдлого хийлээ.",
    improve: hasQuestion
      ? "Одоо ижил санаагаа арай товч, тайван хэмнэлээр дахин хэлээрэй."
      : "Нөгөө хүнд хариулах орон зай өгөх нэг богино асуулт нэмээрэй.",
  };
}

function extractYouTubeId(value: string) {
  const trimmed = value.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    if (url.hostname === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] ?? null;
    if (url.hostname.includes("youtube.com")) {
      if (url.searchParams.get("v")) return url.searchParams.get("v");
      const parts = url.pathname.split("/").filter(Boolean);
      const marker = parts.findIndex((part) => ["embed", "shorts", "live"].includes(part));
      if (marker >= 0) return parts[marker + 1] ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function calculateStreak(dates: string[]) {
  const done = new Set(dates);
  const cursor = new Date();

  if (!done.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (done.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function IconArrow() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export type PracticeExperienceView = "today" | "journey" | "progress" | "arena" | "voice" | "daily";

export function PracticeExperience({ view }: { view: PracticeExperienceView }) {
  const router = useRouter();
  const pastEventPilotEnabled = isPastEventPilotEnabled();
  const [practiceLibraryOpen, setPracticeLibraryOpen] = useState(false);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [practiceStep, setPracticeStep] = useState(0);
  const [seconds, setSeconds] = useState(300);
  const [timerRunning, setTimerRunning] = useState(false);
  const [rating, setRating] = useState(0);
  const [reflection, setReflection] = useState("");
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [localProgressHydrated, setLocalProgressHydrated] = useState(false);
  const [videoId, setVideoId] = useState(defaultVideoId);
  const [videoInput, setVideoInput] = useState("");
  const [videoEditorOpen, setVideoEditorOpen] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [listeningAnswers, setListeningAnswers] = useState({
    summary: "",
    feeling: "",
    question: "",
  });
  const [voicePhase, setVoicePhase] = useState<VoicePhase>("ready");
  const [lessonIndex, setLessonIndex] = useState(() => new Date().getDay() % microLessons.length);
  const [voiceResponse, setVoiceResponse] = useState("");
  const [firstVoiceResponse, setFirstVoiceResponse] = useState("");
  const [voiceFeedback, setVoiceFeedback] = useState<VoiceFeedback | null>(null);
  const [feedbackSource, setFeedbackSource] = useState<"gemini" | "simulation">("simulation");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micMessage, setMicMessage] = useState("");
  const [transcriptRating, setTranscriptRating] = useState<"yes" | "no" | null>(null);
  const [arenaPhase, setArenaPhase] = useState<ArenaPhase>("idle");
  const [arenaIntensity, setArenaIntensity] = useState(4);
  const [arenaLevel, setArenaLevel] = useState(1);
  const [arenaBeat, setArenaBeat] = useState(0);
  const [arenaPaused, setArenaPaused] = useState(false);
  const [arenaHintOpen, setArenaHintOpen] = useState(false);
  const [arenaCompletion, setArenaCompletion] = useState<ArenaCompletion>("completed");
  const [arenaAttempts, setArenaAttempts] = useState<string[]>([]);
  const [arenaAttemptPhase, setArenaAttemptPhase] = useState<ArenaAttemptPhase>("respond");
  const [arenaResponse, setArenaResponse] = useState("");
  const [arenaFirstResponse, setArenaFirstResponse] = useState("");
  const [arenaFeedback, setArenaFeedback] = useState<VoiceFeedback | null>(null);
  const [arenaFeedbackSource, setArenaFeedbackSource] = useState<"gemini" | "simulation">("simulation");
  const [arenaFeedbackLoading, setArenaFeedbackLoading] = useState(false);
  const [arenaIsListening, setArenaIsListening] = useState(false);
  const [arenaIsSpeaking, setArenaIsSpeaking] = useState(false);
  const [arenaMicMessage, setArenaMicMessage] = useState("");
  const [arenaTranscriptRating, setArenaTranscriptRating] = useState<"yes" | "no" | null>(null);
  const [arenaProgress, setArenaProgress] = useState<ArenaProgress>(emptyArenaProgress);
  const [arenaIntensityAfter, setArenaIntensityAfter] = useState(4);
  const [arenaReflection, setArenaReflection] = useState("");
  const [arenaProgressSaved, setArenaProgressSaved] = useState(false);
  const [anonymousBetaId, setAnonymousBetaId] = useState("");
  const [arenaSessionId, setArenaSessionId] = useState("");
  const [betaEvents, setBetaEvents] = useState<BetaEvent[]>([]);
  const [betaRating, setBetaRating] = useState(0);
  const [betaIssue, setBetaIssue] = useState("none");
  const [betaComment, setBetaComment] = useState("");
  const [betaFeedbackSent, setBetaFeedbackSent] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const arenaRecorderRef = useRef<MediaRecorder | null>(null);
  const arenaAudioChunksRef = useRef<Blob[]>([]);
  const arenaAudioStreamRef = useRef<MediaStream | null>(null);

  const exercise = exercises[exerciseIndex];
  const lesson = microLessons[lessonIndex];
  const coachLine = lesson.line;
  const streak = calculateStreak(progress.completedDates);
  const xp = progress.sessions * 10 + arenaProgress.xp;
  const activeArenaBeat = teamLunchBeats[Math.min(arenaBeat, teamLunchBeats.length - 1)];
  const transcriptEvents = betaEvents.filter((event) => event.name === "transcript_confirmed");
  const acceptedTranscripts = transcriptEvents.filter((event) => event.properties.accepted === true).length;
  const sttAcceptanceRate = transcriptEvents.length ? Math.round((acceptedTranscripts / transcriptEvents.length) * 100) : 0;
  const submittedFeedback = betaEvents.filter((event) => event.name === "beta_feedback_submitted");
  const averageBetaRating = submittedFeedback.length
    ? (submittedFeedback.reduce((sum, event) => sum + Number(event.properties.rating ?? 0), 0) / submittedFeedback.length).toFixed(1)
    : "—";

  const { syncSession } = useCloudProgress({
    hydrated: localProgressHydrated,
    daily: progress,
    arena: arenaProgress,
    setDaily: setProgress,
    setArena: setArenaProgress,
  });
  const {
    preferences,
    plan,
    onboardingOpen,
    setOnboardingOpen,
    finishOnboarding,
    skipOnboarding,
    completeToday,
  } = useLearningPlan();
  const todayPlanDay = plan?.days[Math.min((plan.currentDay || 1) - 1, 6)] ?? null;
  const planCompletedToday = plan?.completions.some((item) => item.date === todayKey()) ?? false;
  const goalLabel = preferences?.primaryGoal === "work" ? "Ажил дээр илүү итгэлтэй харилцах"
    : preferences?.primaryGoal === "close-relationships" ? "Ойрын хүмүүстэйгээ тайван ойлголцох"
      : preferences?.primaryGoal === "new-people" ? "Шинэ хүнтэй яриа эхлүүлэх" : "Өдөр бүр бага багаар харилцаагаа хөгжүүлэх";
  const weeklyReport = useMemo(() => {
    if (!plan?.completions.length) return null;
    const counts = plan.completions.reduce<Record<string, number>>((result, item) => {
      result[item.skill] = (result[item.skill] ?? 0) + 1;
      return result;
    }, {});
    const topSkill = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Харилцаа";
    const rated = plan.completions.filter((item) => item.ratingBefore !== null && item.ratingAfter !== null);
    const ratingChange = rated.length
      ? rated.reduce((sum, item) => sum + Number(item.ratingAfter) - Number(item.ratingBefore), 0) / rated.length
      : null;
    return { topSkill, ratingChange };
  }, [plan]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = window.localStorage.getItem("hariltsaa-progress-v1");
        if (saved) setProgress(JSON.parse(saved));
        const savedVideo = window.localStorage.getItem("hariltsaa-youtube-id-v1");
        if (savedVideo && /^[a-zA-Z0-9_-]{11}$/.test(savedVideo)) setVideoId(savedVideo);
        const savedArena = window.localStorage.getItem("hariltsaa-arena-progress-v1");
        if (savedArena) setArenaProgress({ ...emptyArenaProgress, ...JSON.parse(savedArena) });
        const storedBetaId = window.localStorage.getItem("hariltsaa-beta-id-v1");
        const betaId = storedBetaId || crypto.randomUUID();
        setAnonymousBetaId(betaId);
        if (!storedBetaId) window.localStorage.setItem("hariltsaa-beta-id-v1", betaId);
        const storedEvents = window.localStorage.getItem("hariltsaa-beta-events-v1");
        if (storedEvents) setBetaEvents(JSON.parse(storedEvents));
      } catch {
        // The experience still works if browser storage is unavailable.
      }
      setLocalProgressHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!timerRunning || seconds <= 0) return;
    const timer = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [timerRunning, seconds]);

  const week = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date();
      day.setDate(day.getDate() - (6 - index));
      return {
        key: dateKey(day),
        label: ["Н", "Д", "М", "Л", "П", "Б", "Н"][day.getDay()],
        done: progress.completedDates.includes(dateKey(day)),
        today: dateKey(day) === dateKey(),
      };
    });
  }, [progress.completedDates]);

  const trackBetaEvent = (name: BetaEventName, properties: BetaEvent["properties"] = {}, sessionOverride?: string) => {
    const betaId = anonymousBetaId || crypto.randomUUID();
    const sessionId = sessionOverride ?? arenaSessionId;
    if (!anonymousBetaId) {
      setAnonymousBetaId(betaId);
      try { window.localStorage.setItem("hariltsaa-beta-id-v1", betaId); } catch { /* optional */ }
    }
    const event: BetaEvent = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      sessionId,
      properties,
    };
    setBetaEvents((current) => {
      const next = [...current, event].slice(-200);
      try { window.localStorage.setItem("hariltsaa-beta-events-v1", JSON.stringify(next)); } catch { /* optional */ }
      return next;
    });
    void fetch("/api/beta-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: name, anonymousId: betaId, sessionId, properties }),
      keepalive: true,
    }).catch(() => undefined);
  };

  const exportBetaData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      anonymousId: anonymousBetaId,
      arenaProgress,
      events: betaEvents,
      privacy: "Raw audio and transcripts are not included.",
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `eq-dev-beta-${dateKey()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const submitBetaFeedback = () => {
    if (!betaRating || betaFeedbackSent) return;
    trackBetaEvent("beta_feedback_submitted", {
      rating: betaRating,
      issue: betaIssue,
      comment: betaComment.trim().slice(0, 120),
      completion: arenaCompletion,
      level: arenaLevel,
    });
    setBetaFeedbackSent(true);
  };

  const openVoiceCoach = () => {
    document.getElementById("voice-coach")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const startTodayPractice = () => {
    if (!plan || !todayPlanDay) {
      setOnboardingOpen(true);
      return;
    }
    chooseLesson(todayPlanDay.lessonIndex % microLessons.length);
    window.setTimeout(openVoiceCoach, 0);
  };

  const playCoachLine = async () => {
    setVoicePhase("respond");
    setIsSpeaking(true);
    setMicMessage("Монгол аудиог бэлдэж байна…");
    try {
      const response = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: coachLine }),
      });
      if (!response.ok) throw new Error("tts_unavailable");
      const data = await response.json() as { audio?: string; mimeType?: string };
      if (!data.audio) throw new Error("empty_audio");
      const audio = new Audio(`data:${data.mimeType ?? "audio/wav"};base64,${data.audio}`);
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => setIsSpeaking(false);
      setMicMessage("");
      await audio.play();
    } catch {
      setIsSpeaking(false);
      setMicMessage("Аудио тоглуулж чадсангүй. Өгүүлбэрийг уншаад хариулаарай.");
    }
  };

  const startListening = async () => {
    if (isListening) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
      audioStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        setIsListening(false);
        stream.getTracks().forEach((track) => track.stop());
        setMicMessage("Gemini таны Монгол яриаг текст болгож байна…");
        try {
          const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
          const audio = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(String(reader.result).split(",")[1] ?? "");
            reader.onerror = () => reject(new Error("audio_read_failed"));
            reader.readAsDataURL(blob);
          });
          const response = await fetch("/api/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio, mimeType: blob.type }),
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({})) as { error?: string };
            if (errorData.error === "unclear_audio") throw new Error("unclear_audio");
            throw new Error("transcription_failed");
          }
          const data = await response.json() as { transcript?: string };
          if (!data.transcript) throw new Error("empty_transcript");
          setVoiceResponse(data.transcript);
          setTranscriptRating(null);
          setMicMessage("Таны яриаг буулгалаа. Хянаад илгээнэ үү.");
        } catch (error) {
          setMicMessage(error instanceof Error && error.message === "unclear_audio"
            ? "Яриа тод сонсогдсонгүй. Микрофонд ойр, нэг өгүүлбэрээр дахин хэлнэ үү."
            : "Яриаг текст болгож чадсангүй. Дахин оролдох эсвэл бичиж болно.");
        }
      };
      recorder.start();
      setIsListening(true);
      setMicMessage("Сонсож байна… Дуусахдаа товчийг дахин дарна уу.");
      window.setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 12000);
    } catch {
      setMicMessage("Микрофоны зөвшөөрөл хэрэгтэй. Эсвэл доорх талбарт бичиж болно.");
    }
  };

  const finishVoicePractice = () => {
    const today = dateKey();
    const next = {
      ...progress,
      completedDates: Array.from(new Set([...progress.completedDates, today])),
      sessions: progress.sessions + 1,
    };
    const activePlanId = plan?.id ?? null;
    const activePlanDay = plan?.currentDay ?? null;
    setProgress(next);
    try { window.localStorage.setItem("hariltsaa-progress-v1", JSON.stringify(next)); } catch {}
    completeToday(null, null);
    syncSession({
      client_event_id: crypto.randomUUID(),
      session_type: "daily",
      exercise_id: `voice-lesson-${lessonIndex + 1}`,
      level: null,
      intensity_before: null,
      intensity_after: null,
      repetitions: voicePhase === "retry" ? 2 : 1,
      xp_earned: 10,
      reflection: null,
      metadata: { completion: voicePhase === "retry" ? "voice-retry" : "voice-first", skill: todayPlanDay?.skill ?? lesson.skill },
      completed_at: new Date().toISOString(),
      plan_id: activePlanId,
      plan_day: activePlanDay,
      self_rating_before: null,
      self_rating_after: null,
    }, next, arenaProgress);
    setVoicePhase("complete");
  };

  const submitVoiceResponse = async () => {
    if (!voiceResponse.trim()) return;
    setFeedbackLoading(true);
    let result = evaluateResponse(voiceResponse, lesson);
    let source: "gemini" | "simulation" = "simulation";
    try {
      const request = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coachLine,
          lessonTitle: lesson.title,
          lessonGoal: lesson.goal,
          response: voiceResponse.trim(),
          previousResponse: firstVoiceResponse,
          attempt: voicePhase === "retry" ? "retry" : "first",
        }),
      });
      if (request.ok) {
        const data = await request.json() as { feedback?: VoiceFeedback; source?: "gemini" };
        if (data.feedback?.positive && data.feedback?.improve) {
          result = data.feedback;
          source = "gemini";
        }
      }
    } catch {
      // The local coach keeps the exercise usable if Gemini is unavailable.
    }
    setVoiceFeedback(result);
    setFeedbackSource(source);
    setFeedbackLoading(false);
    if (voicePhase === "retry") {
      finishVoicePractice();
    } else {
      setFirstVoiceResponse(voiceResponse.trim());
      setVoicePhase("feedback");
    }
  };

  const beginRetry = () => {
    setVoiceResponse("");
    setMicMessage("");
    setTranscriptRating(null);
    setVoicePhase("retry");
  };

  const resetVoiceCoach = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    setVoicePhase("ready");
    setVoiceResponse("");
    setFirstVoiceResponse("");
    setVoiceFeedback(null);
    setFeedbackSource("simulation");
    setFeedbackLoading(false);
    setMicMessage("");
    setTranscriptRating(null);
  };

  const chooseLesson = (index: number) => {
    resetVoiceCoach();
    setLessonIndex(index);
  };

  const chooseExercise = (index: number) => {
    setExerciseIndex(index);
    setPracticeOpen(true);
    setPracticeStep(0);
    setTimerRunning(false);
    setSeconds(300);
    setRating(0);
  };

  const openArena = () => {
    const nextSessionId = crypto.randomUUID();
    setArenaSessionId(nextSessionId);
    setArenaPhase("checkin");
    setArenaBeat(0);
    setArenaPaused(false);
    setArenaHintOpen(false);
    setArenaAttempts([]);
    setArenaAttemptPhase("respond");
    setArenaResponse("");
    setArenaFirstResponse("");
    setArenaFeedback(null);
    setArenaFeedbackSource("simulation");
    setArenaMicMessage("");
    setArenaTranscriptRating(null);
    setArenaIntensityAfter(arenaIntensity);
    setArenaReflection("");
    setArenaProgressSaved(false);
    setBetaRating(0);
    setBetaIssue("none");
    setBetaComment("");
    setBetaFeedbackSent(false);
    window.setTimeout(() => {
      document.getElementById("arena")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const chooseArenaIntensity = (value: number) => {
    setArenaIntensity(value);
    setArenaLevel(value >= 8 ? 1 : value >= 5 ? Math.min(arenaLevel, 2) : arenaLevel);
  };

  const startArenaScene = () => {
    setArenaPhase("scene");
    setArenaBeat(0);
    setArenaPaused(false);
    setArenaHintOpen(false);
    setArenaAttemptPhase("respond");
    setArenaResponse("");
    setArenaFirstResponse("");
    setArenaFeedback(null);
    setArenaMicMessage("");
    setArenaTranscriptRating(null);
    trackBetaEvent("arena_started", { level: arenaLevel, intensity_before: arenaIntensity, mode: arenaIntensity >= 8 ? "safe" : "standard" });
  };

  const resetArenaAttempt = () => {
    setArenaAttemptPhase("respond");
    setArenaResponse("");
    setArenaFirstResponse("");
    setArenaFeedback(null);
    setArenaFeedbackSource("simulation");
    setArenaFeedbackLoading(false);
    setArenaMicMessage("");
    setArenaTranscriptRating(null);
    setArenaHintOpen(false);
  };

  const continueArenaBeat = () => {
    const completedResponse = arenaResponse.trim() || arenaFirstResponse;
    if (completedResponse) setArenaAttempts((current) => [...current, completedResponse]);
    if (arenaBeat >= teamLunchBeats.length - 1) {
      setArenaCompletion("completed");
      setArenaIntensityAfter(arenaIntensity);
      setArenaPhase("complete");
      return;
    }
    setArenaBeat((current) => current + 1);
    resetArenaAttempt();
  };

  const playArenaLine = async () => {
    const startedAt = performance.now();
    setArenaIsSpeaking(true);
    setArenaMicMessage("Монгол аудиог бэлдэж байна…");
    try {
      const response = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `${activeArenaBeat.speaker}: ${activeArenaBeat.line}` }),
      });
      if (!response.ok) throw new Error("tts_unavailable");
      const data = await response.json() as { audio?: string; mimeType?: string };
      if (!data.audio) throw new Error("empty_audio");
      const audio = new Audio(`data:${data.mimeType ?? "audio/wav"};base64,${data.audio}`);
      audio.onended = () => setArenaIsSpeaking(false);
      audio.onerror = () => setArenaIsSpeaking(false);
      setArenaMicMessage("");
      await audio.play();
      trackBetaEvent("scene_audio_played", { beat: arenaBeat + 1, speaker: activeArenaBeat.speaker, latency_ms: Math.round(performance.now() - startedAt) });
    } catch {
      setArenaIsSpeaking(false);
      setArenaMicMessage("Аудио тоглуулж чадсангүй. Өгүүлбэрийг уншаад үргэлжлүүлж болно.");
    }
  };

  const startArenaListening = async () => {
    if (arenaIsListening) {
      arenaRecorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
      arenaAudioStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const recordingStartedAt = performance.now();
      arenaRecorderRef.current = recorder;
      arenaAudioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) arenaAudioChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        setArenaIsListening(false);
        stream.getTracks().forEach((track) => track.stop());
        trackBetaEvent("response_recorded", { beat: arenaBeat + 1, input_mode: "voice", duration_ms: Math.round(performance.now() - recordingStartedAt) });
        setArenaMicMessage("Таны Монгол яриаг текст болгож байна…");
        try {
          const blob = new Blob(arenaAudioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
          const audio = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(String(reader.result).split(",")[1] ?? "");
            reader.onerror = () => reject(new Error("audio_read_failed"));
            reader.readAsDataURL(blob);
          });
          const response = await fetch("/api/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio, mimeType: blob.type }),
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({})) as { error?: string };
            if (errorData.error === "unclear_audio") throw new Error("unclear_audio");
            throw new Error("transcription_failed");
          }
          const data = await response.json() as { transcript?: string };
          if (!data.transcript) throw new Error("empty_transcript");
          setArenaResponse(data.transcript);
          setArenaTranscriptRating(null);
          setArenaMicMessage("Таны яриаг буулгалаа. Зөв эсэхийг хянаад илгээнэ үү.");
        } catch (error) {
          setArenaMicMessage(error instanceof Error && error.message === "unclear_audio"
            ? "Яриа тод сонсогдсонгүй. Нэг богино өгүүлбэрээр дахин хэлээрэй."
            : "Яриаг текст болгож чадсангүй. Дахин оролдох эсвэл бичиж болно.");
        }
      };
      recorder.start();
      setArenaIsListening(true);
      setArenaMicMessage("Сонсож байна… Дуусахдаа товчийг дахин дарна уу.");
      window.setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 12000);
    } catch {
      setArenaMicMessage("Микрофоны зөвшөөрөл хэрэгтэй. Эсвэл хариултаа бичиж болно.");
    }
  };

  const submitArenaResponse = async () => {
    const responseText = arenaResponse.trim();
    if (!responseText) return;
    if (!arenaMicMessage.includes("буулгалаа")) {
      trackBetaEvent("response_recorded", { beat: arenaBeat + 1, input_mode: "text", duration_ms: 0 });
    }
    setArenaFeedbackLoading(true);
    let result = evaluateArenaResponse(responseText, activeArenaBeat);
    let source: "gemini" | "simulation" = "simulation";
    try {
      const request = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coachLine: `${activeArenaBeat.speaker}: ${activeArenaBeat.line}`,
          lessonTitle: `Багийн өдрийн хоол · ${arenaBeat + 1}-р мөч`,
          lessonGoal: activeArenaBeat.prompt,
          response: responseText,
          previousResponse: arenaFirstResponse,
          attempt: arenaAttemptPhase === "retry" ? "retry" : "first",
        }),
      });
      if (request.ok) {
        const data = await request.json() as { feedback?: VoiceFeedback; source?: "gemini" };
        if (data.feedback?.positive && data.feedback?.improve) {
          result = data.feedback;
          source = "gemini";
        }
      }
    } catch {
      // Local rubric keeps the arena usable when the AI coach is unavailable.
    }
    if (arenaAttemptPhase === "respond") setArenaFirstResponse(responseText);
    setArenaFeedback(result);
    setArenaFeedbackSource(source);
    setArenaFeedbackLoading(false);
    const isRetry = arenaAttemptPhase === "retry";
    trackBetaEvent("feedback_shown", { beat: arenaBeat + 1, source, attempt: isRetry ? "retry" : "first" });
    if (isRetry) trackBetaEvent("retry_completed", { beat: arenaBeat + 1, level: arenaLevel });
    setArenaAttemptPhase(isRetry ? "retry-feedback" : "feedback");
  };

  const beginArenaRetry = () => {
    setArenaAttemptPhase("retry");
    setArenaResponse("");
    setArenaTranscriptRating(null);
    setArenaMicMessage("");
  };

  const safelyFinishArena = () => {
    if (arenaRecorderRef.current?.state === "recording") arenaRecorderRef.current.stop();
    arenaAudioStreamRef.current?.getTracks().forEach((track) => track.stop());
    setArenaCompletion("safe-finish");
    setArenaIntensityAfter(arenaIntensity);
    setArenaProgressSaved(false);
    trackBetaEvent("control_used", { control: "safe_finish", beat: arenaBeat + 1 });
    setArenaPaused(false);
    setArenaPhase("complete");
  };

  const resetArena = () => {
    if (arenaRecorderRef.current?.state === "recording") arenaRecorderRef.current.stop();
    arenaAudioStreamRef.current?.getTracks().forEach((track) => track.stop());
    setArenaPhase("idle");
    setArenaBeat(0);
    setArenaPaused(false);
    setArenaHintOpen(false);
    setArenaAttempts([]);
    resetArenaAttempt();
  };

  const saveArenaProgress = () => {
    if (arenaProgressSaved) return;
    const today = dateKey();
    const repetitions = arenaAttempts.length;
    const practicedDates = Array.from(new Set([...arenaProgress.practicedDates, today]));
    const recoveryDates = arenaCompletion === "completed" && repetitions >= teamLunchBeats.length
      ? Array.from(new Set([...arenaProgress.recoveryDates, today]))
      : arenaProgress.recoveryDates;
    const sessionXp = repetitions * 8 + (arenaReflection.trim() ? 2 : 0);
    const sessionRecord: ArenaSessionRecord = {
      id: crypto.randomUUID(),
      date: today,
      completion: arenaCompletion,
      level: arenaLevel,
      repetitions,
      xp: sessionXp,
      intensityBefore: arenaIntensity,
      intensityAfter: arenaIntensityAfter,
      reflection: arenaReflection.trim(),
    };
    const nextArena: ArenaProgress = {
      sessions: arenaProgress.sessions + 1,
      meaningfulRepetitions: arenaProgress.meaningfulRepetitions + repetitions,
      recoveryStrength: Math.min(5, recoveryDates.length),
      xp: arenaProgress.xp + sessionXp,
      highestLevel: repetitions > 0 ? Math.max(arenaProgress.highestLevel, arenaLevel) : arenaProgress.highestLevel,
      practicedDates,
      recoveryDates,
      lastIntensityBefore: arenaIntensity,
      lastIntensityAfter: arenaIntensityAfter,
      lastCompletion: arenaCompletion,
      history: [sessionRecord, ...arenaProgress.history].slice(0, 20),
    };
    const nextProgress = {
      ...progress,
      completedDates: Array.from(new Set([...progress.completedDates, today])),
    };
    setArenaProgress(nextArena);
    setProgress(nextProgress);
    setArenaProgressSaved(true);
    trackBetaEvent("arena_completed", {
      completion_type: arenaCompletion,
      level: arenaLevel,
      repetitions,
      xp: sessionXp,
      intensity_before: arenaIntensity,
      intensity_after: arenaIntensityAfter,
      duration_reflection: Boolean(arenaReflection.trim()),
    });
    try {
      window.localStorage.setItem("hariltsaa-arena-progress-v1", JSON.stringify(nextArena));
      window.localStorage.setItem("hariltsaa-progress-v1", JSON.stringify(nextProgress));
      if (arenaReflection.trim()) window.localStorage.setItem("hariltsaa-arena-last-reflection", arenaReflection.trim());
    } catch {
      // The result remains visible even if browser storage is unavailable.
    }
    syncSession({
      client_event_id: sessionRecord.id,
      session_type: "arena",
      exercise_id: "team-lunch",
      level: arenaLevel,
      intensity_before: arenaIntensity,
      intensity_after: arenaIntensityAfter,
      repetitions,
      xp_earned: sessionXp,
      reflection: arenaReflection.trim() || null,
      metadata: { completion: arenaCompletion },
      completed_at: new Date().toISOString(),
    }, nextProgress, nextArena);
  };

  const changeVideo = () => {
    const nextId = extractYouTubeId(videoInput);
    if (!nextId) {
      setVideoError("YouTube холбоос зөв эсэхийг шалгаарай.");
      return;
    }
    setVideoId(nextId);
    setVideoError("");
    setVideoEditorOpen(false);
    try {
      window.localStorage.setItem("hariltsaa-youtube-id-v1", nextId);
    } catch {
      // The selected source still works for the current session.
    }
  };

  const resetVideo = () => {
    setVideoId(defaultVideoId);
    setVideoInput("");
    setVideoError("");
    try {
      window.localStorage.removeItem("hariltsaa-youtube-id-v1");
    } catch {
      // Ignore browser storage restrictions.
    }
  };

  const saveSession = () => {
    if (!rating) return;
    const today = dateKey();
    const next: Progress = {
      completedDates: Array.from(new Set([...progress.completedDates, today])),
      sessions: progress.sessions + 1,
      lastRating: rating,
    };
    setProgress(next);
    try {
      window.localStorage.setItem("hariltsaa-progress-v1", JSON.stringify(next));
      if (reflection.trim()) {
        window.localStorage.setItem("hariltsaa-last-reflection", reflection.trim());
      }
    } catch {
      // Saving is optional; completion feedback remains visible.
    }
    const activePlanId = plan?.id ?? null;
    const activePlanDay = plan?.currentDay ?? null;
    completeToday(null, rating);
    syncSession({
      client_event_id: crypto.randomUUID(),
      session_type: "daily",
      exercise_id: `daily-${exerciseIndex + 1}`,
      level: null,
      intensity_before: null,
      intensity_after: rating,
      repetitions: 1,
      xp_earned: 10,
      reflection: reflection.trim() || null,
      metadata: { completion: "daily" },
      completed_at: new Date().toISOString(),
      plan_id: activePlanId,
      plan_day: activePlanDay,
      self_rating_before: null,
      self_rating_after: rating,
    }, next, arenaProgress);
    setPracticeStep(3);
  };

  const timeLabel = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <main className={`practice-experience practice-view-${view}`}>
      <OnboardingModal open={view === "today" && onboardingOpen} onComplete={finishOnboarding} onSkip={skipOnboarding} />

      {view === "today" && (
      <>
      <section className="hero" id="top">
        <div className="leaf leaf-left" aria-hidden="true" />
        <div className="leaf leaf-right" aria-hidden="true" />
        <div className="hero-main">
          <p className="eyebrow">ӨНӨӨДРИЙН ЗОРИЛГО</p>

          {pastEventPilotEnabled ? (
            <TodayPracticeRouter
              dailyMinutes={preferences?.dailyMinutes ?? 3}
              completedDays={plan?.completions.length ?? 0}
              streak={streak}
              onDailyPractice={startTodayPractice}
              onStartRoute={(route) => router.push(route === "daily_skill_loop" ? "/practice/daily" : `/practice/personal?route=${route}`)}
            />
          ) : <article className="featured-practice">
            <div>
              <p className="card-kicker">{plan ? `ӨНӨӨДРИЙН ${preferences?.dailyMinutes ?? 3} МИНУТЫН ДАСГАЛ · ӨДӨР ${plan.currentDay}/7` : "ТАНЫ ХУВИЙН ДАСГАЛЫН ЗАМ"}</p>
              <h2>{todayPlanDay?.title ?? "7 өдрийн замаа эхлүүлэх"}</h2>
              <p className="plan-goal">Таны зорилго: {goalLabel}</p>
              <p className="today-reason">{todayPlanDay?.reason ?? "Гурван богино сонголтоор өдөр бүр юу хийхээ тодорхой болгоно."}</p>
              <div className="today-meta">
                <span>{preferences?.dailyMinutes ?? 3} минут</span>
                <span>{plan?.completions.length ?? 0}/7 өдөр</span>
                <span>{streak} өдөр дараалан</span>
              </div>
            </div>
            <div className="today-actions">
              <button className="primary-button light" onClick={() => plan ? router.push("/practice/daily") : startTodayPractice()} disabled={planCompletedToday && plan?.status === "completed"}>
                {planCompletedToday ? "Дахин давтах" : plan ? "Өнөөдрийн дасгалыг эхлүүлэх" : "Замаа үүсгэх"} <IconArrow />
              </button>
              {plan && <button className="today-change" type="button" onClick={() => router.push("/practice/voice")}>Дасгалаа өөрчлөх</button>}
            </div>
          </article>}
        </div>

      </section>
      <section className="today-library section-shell" aria-labelledby="today-library-title">
        <button
          className="today-library-toggle"
          type="button"
          aria-expanded={practiceLibraryOpen}
          aria-controls="today-library-options"
          onClick={() => setPracticeLibraryOpen((current) => !current)}
        >
          <span><small>SECONDARY</small><b id="today-library-title">Өөр дасгал</b></span>
          <span aria-hidden="true">{practiceLibraryOpen ? "−" : "+"}</span>
        </button>
        {practiceLibraryOpen && (
          <div id="today-library-options" className="today-library-panel">
            <p>Өнөөдрийн санал тохирохгүй бол өөр богино дасгал сонгож болно.</p>
            <div className="today-library-grid">
              <Link href="/practice/personal"><b>Personal Practice</b><span>Past repair ба varied rehearsal</span></Link>
              <Link href="/practice/arena"><b>Ярианы талбар</b><span>Багийн өдрийн хоол</span></Link>
              <Link href="/practice/voice"><b>AI дадлага</b><span>Сонсох, хариулах, retry</span></Link>
              <Link href="/practice/daily"><b>Өдөр тутмын чадвар</b><span>3–10 минутын давталт</span></Link>
              <Link href="/practice/roleplay"><b>Дүрд тоглох</b><span>Ажил, гэр бүл, хил хязгаар</span></Link>
            </div>
          </div>
        )}
      </section>
      </>
      )}

      {view === "arena" && (
      <section className="arena-section" id="arena">
        <div className="section-shell">
          <div className="section-heading arena-heading">
            <div>
              <p className="eyebrow">ШИНЭ · ЯРИАНЫ ТАЛБАР</p>
              <h2>Багийн өдрийн хоол</h2>
            </div>
            <p>Бүлгийн ярианд орох, анхаарал өөр дээр ирэх, гацсан үед сэргэхээ ганцаараа аюулгүй давт.</p>
          </div>

          {arenaPhase === "idle" && (
            <article className="arena-card">
              <div className="arena-card-copy">
                <div className="arena-pills">
                  <span>3–5 минут</span><span>Ганцаараа</span><span>{arenaProgress.meaningfulRepetitions || 3} {arenaProgress.meaningfulRepetitions ? "давталт хийсэн" : "жижиг яриа"}</span>
                </div>
                <p className="small-label">FLAGSHIP ARENA · LEVEL 1–3</p>
                <h3>Төгс хариулах биш,<br />ярианд жижигхэн оролцох</h3>
                <p>Сараа, Тэмүүлэн, Болд нартай өдрийн хоолонд сууж байна гэж төсөөлнө. Юу болохыг эхлээд мэдэж, эрчмээ өөрөө сонгоно.</p>
                <button className="primary-button" type="button" onClick={openArena}>Аюулгүй эхлэх <IconArrow /></button>
              </div>
              <div className="arena-preview" aria-label="Дасгалын гурван үе">
                <div><b>01</b><span>Ширээнд нэгдэх<small>Мэндлэх + нэг баримт</small></span></div>
                <div><b>02</b><span>Ярианд орох<small>Нэг холбоос асуулт</small></span></div>
                <div><b>03</b><span>Анхаарлаас сэргэх<small>Recovery phrase</small></span></div>
                <p>{arenaProgress.sessions ? `Recovery ${arenaProgress.recoveryStrength}/5 · ${arenaProgress.xp} XP` : "Pause · Hint · Level down · Safe finish"}</p>
              </div>
            </article>
          )}

          {arenaPhase === "checkin" && (
            <article className="arena-workspace arena-checkin">
              <div className="arena-workspace-head">
                <button className="arena-back" type="button" onClick={resetArena}>← Буцах</button>
                <span>Алхам 1 / 2 · Бэлэн байдлаа сонгох</span>
              </div>
              <div className="arena-checkin-grid">
                <div>
                  <p className="small-label">ЯГ ОДОО</p>
                  <h3>Энэ дасгал хэр хүчтэй санагдаж байна?</h3>
                  <p className="arena-helper">Энэ нь эмнэлгийн үнэлгээ биш. Зөвхөн өнөөдрийн дасгалын эрчмийг тохируулна.</p>
                  <div className="intensity-scale" role="group" aria-label="0-ээс 10 хүртэлх эрчим">
                    {Array.from({ length: 11 }, (_, value) => (
                      <button key={value} type="button" className={arenaIntensity === value ? "active" : ""} aria-pressed={arenaIntensity === value} onClick={() => chooseArenaIntensity(value)}>{value}</button>
                    ))}
                  </div>
                  <div className="intensity-labels"><span>Тайван</span><span>Нэлээд хүчтэй</span></div>
                  {arenaIntensity >= 8 && <div className="safe-recommendation"><b>Өнөөдөр safe mode тохиромжтой.</b><p>Урьдчилан бэлэн хариутай Level 1-ээс эхэлнэ. Хүссэн үедээ дуусгаж болно.</p></div>}
                </div>
                <div className="level-panel">
                  <p className="small-label">ХҮНДРЭЛИЙН ТҮВШИН</p>
                  {arenaLevels.map((item) => (
                    <button key={item.level} type="button" className={arenaLevel === item.level ? "active" : ""} onClick={() => setArenaLevel(item.level)} disabled={arenaIntensity >= 8 && item.level > 1}>
                      <b>{item.level}</b><span>{item.name}<small>{item.detail}</small></span>{arenaLevel === item.level && <i>✓</i>}
                    </button>
                  ))}
                  <button className="primary-button" type="button" onClick={() => setArenaPhase("brief")}>Нөхцөлтэй танилцах <IconArrow /></button>
                </div>
              </div>
            </article>
          )}

          {arenaPhase === "brief" && (
            <article className="arena-workspace arena-brief">
              <div className="arena-workspace-head">
                <button className="arena-back" type="button" onClick={() => setArenaPhase("checkin")}>← Буцах</button>
                <span>Алхам 2 / 2 · Юу болохыг урьдчилан мэдэх</span>
              </div>
              <div className="brief-grid">
                <div>
                  <p className="small-label">НӨХЦӨЛ</p>
                  <h3>Та 5 хүний багтайгаа кафед сууна</h3>
                  <p>Энэ хувилбарт нэг удаад нэг хүн ярьж, танд бэлэн хариу харагдана. Хэн ч доромжлохгүй, гэнэтийн чанга дайралт байхгүй.</p>
                  <div className="character-row" aria-label="Дасгалын дүрүүд">
                    <span><b>С</b>Сараа<small>найрсаг</small></span>
                    <span><b>Т</b>Тэмүүлэн<small>хурдан</small></span>
                    <span><b>Б</b>Болд<small>ахлах</small></span>
                  </div>
                </div>
                <aside className="safety-contract">
                  <p className="small-label">ТАНЫ ХЯНАЛТ</p>
                  <ul><li>Хүссэн үедээ pause</li><li>Хариултын санаа харах</li><li>Түвшин бууруулах</li><li>Оноо алдалгүй дуусгах</li></ul>
                  <div><span>Өнөөдрийн эрчим <b>{arenaIntensity}/10</b></span><span>Level <b>{arenaLevel}</b></span></div>
                  <button className="primary-button" type="button" onClick={startArenaScene}>Яриаг эхлүүлэх <IconArrow /></button>
                </aside>
              </div>
            </article>
          )}

          {arenaPhase === "scene" && (
            <article className="arena-workspace arena-scene" aria-live="polite">
              <div className="arena-scene-top">
                <div><p className="small-label">БАГИЙН ӨДРИЙН ХООЛ</p><strong>{arenaBeat + 1} / {teamLunchBeats.length}</strong></div>
                <div className="arena-controls">
                  <button type="button" onClick={() => { setArenaPaused(!arenaPaused); trackBetaEvent("control_used", { control: arenaPaused ? "resume" : "pause", beat: arenaBeat + 1 }); }}>{arenaPaused ? "▶ Үргэлжлүүлэх" : "Ⅱ Pause"}</button>
                  <button type="button" onClick={() => { setArenaHintOpen(!arenaHintOpen); if (!arenaHintOpen) trackBetaEvent("control_used", { control: "hint", beat: arenaBeat + 1 }); }}>◇ Hint</button>
                  <button type="button" onClick={() => { setArenaLevel((level) => Math.max(1, level - 1)); trackBetaEvent("control_used", { control: "level_down", beat: arenaBeat + 1 }); }} disabled={arenaLevel === 1}>↓ Level</button>
                  <button className="safe-exit" type="button" onClick={safelyFinishArena}>Энд дуусгах</button>
                </div>
              </div>
              {arenaPaused ? (
                <div className="arena-paused"><span>Ⅱ</span><h3>Түр зогслоо</h3><p>Амьсгалаа ажиглаад, бэлэн үедээ үргэлжлүүлээрэй.</p><button className="primary-button" type="button" onClick={() => setArenaPaused(false)}>Үргэлжлүүлэх</button></div>
              ) : (
                <div className="scene-grid">
                  <div className="scene-context">
                    <span className="scene-number">0{arenaBeat + 1}</span>
                    <p>{arenaBeat === 0 ? "Ширээнд нэгдэх" : arenaBeat === 1 ? "Ярианд орох" : "Анхаарлаас сэргэх"}</p>
                    <div className="scene-progress">{teamLunchBeats.map((_, index) => <i key={index} className={index <= arenaBeat ? "active" : ""} />)}</div>
                    <small>Level {arenaLevel} · {arenaLevels[arenaLevel - 1].name}</small>
                  </div>
                  <div className="scene-conversation">
                    <div className="speaker-line">
                      <span>{activeArenaBeat.speaker}<small>{activeArenaBeat.tone}</small></span>
                      <p>“{activeArenaBeat.line}”</p>
                      <button type="button" onClick={playArenaLine} disabled={arenaIsSpeaking}>{arenaIsSpeaking ? "Аудио бэлдэж байна…" : "▶ Монгол яриаг сонсох"}</button>
                    </div>

                    {(arenaAttemptPhase === "respond" || arenaAttemptPhase === "retry") && (
                      <div className="arena-response-panel">
                        <p className="attempt-label">{arenaAttemptPhase === "retry" ? "ДАХИН ХЭЛЭХ" : "ТАНЫ ХАРИУ"}</p>
                        <h3>{arenaAttemptPhase === "retry" ? "Нэг сайжруулалтаа ашиглаад дахин хэлээрэй." : activeArenaBeat.prompt}</h3>
                        {arenaHintOpen && <div className="arena-hint"><b>Хариултын санаа</b><p>{activeArenaBeat.hint}</p></div>}
                        {arenaAttemptPhase === "respond" && arenaLevel === 1 && (
                          <div className="guided-responses" aria-label="Бэлэн хариултын хувилбар">
                            {activeArenaBeat.responses.map((response) => <button type="button" key={response} onClick={() => setArenaResponse(response)}>{response}<span>Сонгох</span></button>)}
                          </div>
                        )}
                        <div className="arena-voice-actions">
                          <button className={`mic-button ${arenaIsListening ? "listening" : ""}`} type="button" onClick={startArenaListening} disabled={arenaIsSpeaking || arenaFeedbackLoading}>
                            <span>●</span>{arenaIsListening ? "Дуусгах" : "Микрофоноор хариулах"}
                          </button>
                          <span>эсвэл бичгээр</span>
                        </div>
                        <label htmlFor="arena-response">Таны хэлэх өгүүлбэр</label>
                        <textarea id="arena-response" rows={3} value={arenaResponse} onChange={(event) => { setArenaResponse(event.target.value); setArenaTranscriptRating(null); }} placeholder={activeArenaBeat.responses[0]} />
                        {arenaMicMessage && <p className="arena-mic-message">{arenaMicMessage}</p>}
                        {arenaResponse && arenaMicMessage.includes("буулгалаа") && (
                          <div className="transcript-check arena-transcript-check">
                            <span>Энэ хөрвүүлэлт зөв үү?</span>
                            <button type="button" className={arenaTranscriptRating === "yes" ? "active" : ""} onClick={() => { if (arenaTranscriptRating !== "yes") trackBetaEvent("transcript_confirmed", { beat: arenaBeat + 1, accepted: true, edited: false }); setArenaTranscriptRating("yes"); }}>Тийм</button>
                            <button type="button" className={arenaTranscriptRating === "no" ? "active no" : ""} onClick={() => { if (arenaTranscriptRating !== "no") trackBetaEvent("transcript_confirmed", { beat: arenaBeat + 1, accepted: false, edited: true }); setArenaTranscriptRating("no"); setArenaMicMessage("Зөрүүтэй үгийг засаад илгээх эсвэл дахин хэлээрэй."); }}>Үгүй</button>
                          </div>
                        )}
                        <button className="primary-button arena-submit" type="button" disabled={!arenaResponse.trim() || arenaFeedbackLoading || arenaIsListening || (arenaMicMessage.includes("буулгалаа") && arenaTranscriptRating !== "yes")} onClick={submitArenaResponse}>
                          {arenaFeedbackLoading ? "AI зөвлөгөө бэлдэж байна…" : arenaAttemptPhase === "retry" ? "Дахин хэлснээ шалгах" : "Хариултаа шалгах"} {!arenaFeedbackLoading && <IconArrow />}
                        </button>
                        <p className="scene-note">Transcript-ээ засаж болно. Баталгаагүй аудиог AI үнэлэхгүй.</p>
                      </div>
                    )}

                    {(arenaAttemptPhase === "feedback" || arenaAttemptPhase === "retry-feedback") && arenaFeedback && (
                      <div className="arena-feedback-panel">
                        <div className={`feedback-source ${arenaFeedbackSource}`}>{arenaFeedbackSource === "gemini" ? "Gemini-ийн хувийн зөвлөгөө" : "Local хамгаалалттай зөвлөгөө"}</div>
                        <p className="attempt-label">{arenaAttemptPhase === "retry-feedback" ? "ДАХИН ХЭЛСЭН ХАРИУ" : "ТАНЫ ЭХНИЙ ХАРИУЛТ"}</p>
                        <blockquote>“{arenaAttemptPhase === "retry-feedback" ? arenaResponse : arenaFirstResponse}”</blockquote>
                        <div className="feedback-line good"><b>✓ Сайн болсон</b><p>{arenaFeedback.positive}</p></div>
                        <div className="feedback-line improve"><b>→ Нэг сайжруулалт</b><p>{arenaFeedback.improve}</p></div>
                        {arenaAttemptPhase === "feedback" ? (
                          <button className="primary-button" type="button" onClick={beginArenaRetry}>Нэг удаа дахин хэлэх <IconArrow /></button>
                        ) : (
                          <button className="primary-button" type="button" onClick={continueArenaBeat}>{arenaBeat === teamLunchBeats.length - 1 ? "Талбарыг дуусгах" : "Дараагийн мөч"} <IconArrow /></button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </article>
          )}

          {arenaPhase === "complete" && (
            <article className="arena-workspace arena-complete">
              <span className={arenaCompletion === "completed" ? "complete-mark" : "safe-mark"}>{arenaCompletion === "completed" ? "✓" : "Ⅱ"}</span>
              <p className="small-label">{arenaCompletion === "completed" ? "ТАЛБАР ДУУСЛАА" : "АЮУЛГҮЙ ДУУСГАЛТ"}</p>
              <h3>{arenaCompletion === "completed" ? "Та ярианд 3 удаа оролцлоо." : "Өнөөдөр энд дуусгах нь зөв сонголт байж болно."}</h3>
              <p>{arenaCompletion === "completed" ? "Мэндэлж, холбоос асуулт тавьж, анхаарал өөр дээр ирэхэд богино хариуллаа." : "Ахиц устахгүй, оноо хасахгүй. Дараагийн удаа ижил эсвэл хөнгөн түвшнээс үргэлжлүүлээрэй."}</p>
              <div className="arena-result"><span><b>{arenaAttempts.length}</b> Meaningful repetition</span><span><b>Level {arenaLevel}</b> өнөөдрийн түвшин</span><span><b>+{arenaAttempts.length * 8 + (arenaReflection.trim() ? 2 : 0)} XP</b> энэ session</span></div>

              {!arenaProgressSaved ? (
                <div className="arena-review-form">
                  <div className="review-intensity-head"><label>Одоо дасгал хэр хүчтэй санагдаж байна?</label><b>{arenaIntensityAfter}/10</b></div>
                  <input type="range" min="0" max="10" value={arenaIntensityAfter} onChange={(event) => setArenaIntensityAfter(Number(event.target.value))} aria-label="Дасгалын дараах эрчим" />
                  <div className="review-intensity-change"><span>Эхлэхэд {arenaIntensity}/10</span><strong className={arenaIntensityAfter <= arenaIntensity ? "down" : "up"}>{arenaIntensityAfter === arenaIntensity ? "Өөрчлөлтгүй" : arenaIntensityAfter < arenaIntensity ? `${arenaIntensity - arenaIntensityAfter}-аар буурсан` : `${arenaIntensityAfter - arenaIntensity}-аар нэмэгдсэн`}</strong></div>
                  <label htmlFor="arena-reflection">Нэг өгүүлбэрийн reflection <span>(заавал биш · +2 XP)</span></label>
                  <textarea id="arena-reflection" rows={2} value={arenaReflection} onChange={(event) => setArenaReflection(event.target.value)} placeholder="Хамгийн хэцүү мөч нь… Дараагийн удаа би…" />
                  <button className="primary-button" type="button" onClick={saveArenaProgress}>Ахицдаа хадгалах <IconArrow /></button>
                </div>
              ) : (
                <div className="arena-saved-summary">
                  <span>✓</span>
                  <div><b>Өнөөдрийн ахиц хадгалагдлаа</b><p>{arenaProgress.meaningfulRepetitions} нийт давталт · Recovery {arenaProgress.recoveryStrength}/5 · {arenaProgress.xp} Arena XP</p></div>
                </div>
              )}

              {arenaProgressSaved && (
                <div className="beta-feedback-card">
                  {!betaFeedbackSent ? (
                    <>
                      <div><p className="small-label">BETA FEEDBACK · 20 СЕКУНД</p><h4>Энэ дасгал танд хэр хэрэгтэй санагдав?</h4></div>
                      <div className="beta-rating" role="group" aria-label="Дасгалын хэрэгцээ 1-ээс 5">
                        {[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} className={betaRating === value ? "active" : ""} aria-pressed={betaRating === value} onClick={() => setBetaRating(value)}>{value}</button>)}
                      </div>
                      <label htmlFor="beta-issue">Хамгийн их саад болсон зүйл</label>
                      <select id="beta-issue" value={betaIssue} onChange={(event) => setBetaIssue(event.target.value)}>
                        <option value="none">Саад байгаагүй</option><option value="stt">Яриа буруу хөрвүүлсэн</option><option value="tts">Дүрийн дуу ойлгомжгүй</option><option value="feedback">AI зөвлөгөө тохироогүй</option><option value="intensity">Хэт хэцүү санагдсан</option><option value="ui">Яаж ашиглах нь ойлгомжгүй</option><option value="other">Бусад</option>
                      </select>
                      <label htmlFor="beta-comment">Нэг өгүүлбэр <span>(заавал биш)</span></label>
                      <textarea id="beta-comment" rows={2} maxLength={300} value={betaComment} onChange={(event) => setBetaComment(event.target.value)} placeholder="Юуг өөрчилбөл илүү хэрэгтэй болох вэ?" />
                      <p className="beta-privacy">Аудио болон таны дасгалын transcript илгээгдэхгүй. Энд нууц мэдээлэл бүү бичээрэй.</p>
                      <button className="primary-button" type="button" disabled={!betaRating} onClick={submitBetaFeedback}>Feedback илгээх</button>
                    </>
                  ) : (
                    <div className="beta-thanks"><span>♡</span><div><b>Баярлалаа.</b><p>Таны feedback дараагийн хувилбарыг шийдэхэд ашиглагдана.</p></div></div>
                  )}
                </div>
              )}

              <div className="arena-complete-actions"><button className="primary-button" type="button" onClick={openArena}>Дахин хийх</button><button className="text-button" type="button" onClick={resetArena}>Дуусгах <IconArrow /></button></div>
            </article>
          )}
        </div>
      </section>
      )}

      {view === "voice" && (
      <section className="voice-coach-section" id="voice-coach">
        <div className="section-shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ТУРШИЛТЫН AI ДАСГАЛЖУУЛАГЧ</p>
              <h2>Нэг удаад ганцхан яриа</h2>
            </div>
            <p>Урт бичлэггүй. 5–8 секунд сонсоод, өөрийнхөөрөө хариулж, нэг зөвлөгөө аваад дахин хэлнэ.</p>
          </div>

          <div className="voice-coach-shell">
            <ol className="voice-path" aria-label="Дасгалын алхам">
              <li className={voicePhase !== "ready" ? "done" : "active"}><b>1</b><span>Сонсох<small>Нэг богино өгүүлбэр</small></span></li>
              <li className={["feedback", "retry", "complete"].includes(voicePhase) ? "done" : voicePhase === "respond" ? "active" : ""}><b>2</b><span>Хариулах<small>1–2 өгүүлбэр</small></span></li>
              <li className={["retry", "complete"].includes(voicePhase) ? "done" : voicePhase === "feedback" ? "active" : ""}><b>3</b><span>Зөвлөгөө<small>Ганц сайжруулалт</small></span></li>
              <li className={voicePhase === "complete" ? "done" : voicePhase === "retry" ? "active" : ""}><b>4</b><span>Дахин хэлэх<small>Нэг удаагийн давталт</small></span></li>
            </ol>

            <article className="voice-stage" aria-live="polite">
              <div className={`simulation-badge ${feedbackSource === "gemini" ? "connected" : ""}`}>
                <i /> {feedbackSource === "gemini" ? "Gemini AI · холбогдсон" : "Gemini бэлэн · fallback хамгаалалттай"}
              </div>
              <div className="lesson-status" aria-label="Дасгалын оноо">
                <span>Өдөр {lessonIndex + 1}/7</span><b>{xp} XP</b><span>🔥 {streak} өдөр</span>
              </div>

              {voicePhase === "ready" && (
                <div className="voice-intro">
                  <span className="coach-avatar">AI</span>
                  <p className="small-label">{lesson.skill} · 1 МИНУТ</p>
                  <h3>{lesson.title}</h3>
                  <p>Бэлэн болмогц богино яриаг сонсоно. Тэмдэглэл хийх шаардлагагүй.</p>
                  <button className="primary-button" onClick={playCoachLine} disabled={isSpeaking}>{isSpeaking ? "Аудио бэлдэж байна…" : "▶ Монгол яриаг сонсох"}</button>
                  <div className="lesson-picker" aria-label="7 өдрийн микро дасгал">
                    {microLessons.map((item, index) => (
                      <button type="button" className={lessonIndex === index ? "active" : ""} onClick={() => chooseLesson(index)} aria-label={`${index + 1}-р дасгал: ${item.title}`} key={item.title}>
                        {index + 1}
                      </button>
                    ))}
                  </div>
                  <small className="lesson-count">7 өдрийн зам · Өнөөдрийн lesson {lessonIndex + 1}/7</small>
                </div>
              )}

              {(voicePhase === "respond" || voicePhase === "retry") && (
                <div className="voice-response">
                  <div className="coach-bubble">
                    <span>ДАСГАЛЖУУЛАГЧ</span>
                    <p>“{coachLine}”</p>
                    <button type="button" onClick={playCoachLine} disabled={isSpeaking}>{isSpeaking ? "Аудио бэлдэж байна…" : "↻ Дахин сонсох"}</button>
                  </div>
                  <p className="response-prompt">Та юу гэж хариулах вэ?</p>
                  <div className="response-actions">
                    <button className={`mic-button ${isListening ? "listening" : ""}`} type="button" onClick={startListening}>
                      <span>●</span>{isListening ? "Дуусгах" : "Микрофоноор хариулах"}
                    </button>
                    <span>эсвэл</span>
                  </div>
                  <label htmlFor="voice-response">Хариултаа бичих</label>
                  <textarea id="voice-response" rows={3} value={voiceResponse} onChange={(event) => setVoiceResponse(event.target.value)} placeholder={`Жишээ: ${lesson.placeholder}`} />
                  {micMessage && <p className="mic-message">{micMessage}</p>}
                  {voiceResponse && micMessage.includes("буулгалаа") && (
                    <div className="transcript-check">
                      <span>Энэ хөрвүүлэлт зөв үү?</span>
                      <button type="button" className={transcriptRating === "yes" ? "active" : ""} onClick={() => setTranscriptRating("yes")}>Тийм</button>
                      <button type="button" className={transcriptRating === "no" ? "active no" : ""} onClick={() => { setTranscriptRating("no"); setMicMessage("Зөрүүтэй үгийг засаад илгээх эсвэл микрофоноор дахин хэлээрэй."); }}>Үгүй</button>
                    </div>
                  )}
                  <button className="primary-button" disabled={!voiceResponse.trim() || feedbackLoading} onClick={submitVoiceResponse}>
                    {feedbackLoading ? "AI үнэлж байна…" : voicePhase === "retry" ? "Дахин хэлснээ дуусгах" : "Хариултаа шалгах"} {!feedbackLoading && <IconArrow />}
                  </button>
                </div>
              )}

              {voicePhase === "feedback" && voiceFeedback && (
                <div className="voice-feedback">
                  <div className={`feedback-source ${feedbackSource}`}>
                    {feedbackSource === "gemini" ? "Gemini-ийн хувийн зөвлөгөө" : "Түр local зөвлөгөө · Gemini доголдвол автоматаар ажиллана"}
                  </div>
                  <p className="small-label">ТАНЫ ЭХНИЙ ХАРИУЛТ</p>
                  <blockquote>“{firstVoiceResponse}”</blockquote>
                  <div className="feedback-line good"><b>✓ Сайн болсон</b><p>{voiceFeedback.positive}</p></div>
                  <div className="feedback-line improve"><b>→ Нэг сайжруулалт</b><p>{voiceFeedback.improve}</p></div>
                  <div className="feedback-line model"><b>↗ Дахин хэлэх хувилбар</b><p>“{lesson.placeholder}”</p></div>
                  <div className="feedback-actions">
                    <button className="primary-button" onClick={beginRetry}>Дахин оролдох <IconArrow /></button>
                    <button className="text-button" onClick={finishVoicePractice}>Өнөөдрийн дасгалыг дуусгах</button>
                  </div>
                </div>
              )}

              {voicePhase === "complete" && (
                <div className="voice-complete">
                  <span>✓</span>
                  <p className="small-label">1 МИНУТЫН ДАСГАЛ ДУУСЛАА</p>
                  <h3>Өнөөдрийн жижиг ялалт.</h3>
                  <div className="xp-reward"><b>+10 XP</b><span>Нийт {xp} XP · 🔥 {streak} өдрийн дараалал</span></div>
                  <p>Та сонсож, хариулж, зөвлөгөөг ашиглан дахин хэллээ. Энэ бол бодит ярианд шилжих хамгийн богино давталт.</p>
                  <button className="text-button" onClick={resetVoiceCoach}>Дахин хийх <IconArrow /></button>
                  <button className="primary-button next-lesson" onClick={() => chooseLesson((lessonIndex + 1) % microLessons.length)}>Дараагийн lesson <IconArrow /></button>
                </div>
              )}
            </article>
          </div>
        </div>
      </section>
      )}

      {view === "daily" && (
      <section className="practice-section section-shell" id="practice">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ӨДӨР ТУТМЫН ДАСГАЛ</p>
            <h2>Өнөөдөр нэг чадвараа давт</h2>
          </div>
          <p>Жижиг давталт бодит яриан дээр том өөрчлөлт бий болгоно.</p>
        </div>

        <div className="exercise-picker" role="list" aria-label="Дасгал сонгох">
          {exercises.map((item, index) => (
            <button
              type="button"
              className={`exercise-chip ${exerciseIndex === index ? "active" : ""}`}
              key={item.name}
              onClick={() => chooseExercise(index)}
              role="listitem"
            >
              <span>0{index + 1}</span>
              <b>{item.name}</b>
              <small>{item.skill}</small>
            </button>
          ))}
        </div>

        {practiceOpen && (
          <article className="practice-workspace" aria-live="polite">
            <div className="workspace-progress" aria-label={`Дасгалын ${Math.min(practiceStep + 1, 3)}-р алхам`}>
              {[0, 1, 2].map((step) => (
                <i key={step} className={practiceStep >= step ? "active" : ""} />
              ))}
            </div>

            {practiceStep === 0 && (
              <div className="workspace-content">
                <span className="step-number">01</span>
                <div>
                  <p className="small-label">БЭЛТГЭХ</p>
                  <h3>{exercise.name}</h3>
                  <p>{exercise.instruction}</p>
                  <blockquote>{exercise.example}</blockquote>
                  <button className="primary-button" onClick={() => setPracticeStep(1)}>
                    Дадлага руу орох <IconArrow />
                  </button>
                </div>
              </div>
            )}

            {practiceStep === 1 && exerciseIndex === 0 && (
              <div className="listening-lab">
                <div className="video-column">
                  <div className="video-heading">
                    <div>
                      <p className="small-label">01 · СОНСОХ МАТЕРИАЛ</p>
                      <h3>90 секунд анхааралтай сонс</h3>
                    </div>
                    <button className="source-button" type="button" onClick={() => setVideoEditorOpen(!videoEditorOpen)}>
                      {videoEditorOpen ? "Хаах" : "Өөр видео"}
                    </button>
                  </div>

                  {videoEditorOpen && (
                    <div className="video-editor">
                      <label htmlFor="youtube-url">YouTube холбоос</label>
                      <div>
                        <input
                          id="youtube-url"
                          type="url"
                          value={videoInput}
                          onChange={(event) => setVideoInput(event.target.value)}
                          placeholder="https://www.youtube.com/watch?v=..."
                        />
                        <button type="button" onClick={changeVideo}>Солих</button>
                      </div>
                      {videoError && <p role="alert">{videoError}</p>}
                      {videoId !== defaultVideoId && (
                        <button className="reset-source" type="button" onClick={resetVideo}>Анхны бичлэг рүү буцах</button>
                      )}
                    </div>
                  )}

                  <div className="video-frame">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1&end=95`}
                      title="Идэвхтэй сонсох дадлагын YouTube бичлэг"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                  <div className="video-note">
                    <span>▶</span>
                    <p><b>Нэг л удаа сонс.</b> Эхний 0:00–1:30 хэсэгт тэмдэглэл хийхгүй, хариултаа урьдчилж бодохгүй.</p>
                  </div>
                  <a className="youtube-fallback" href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noreferrer">
                    Энд тоглохгүй бол YouTube дээр нээх ↗
                  </a>
                </div>

                <div className="listening-form">
                  <p className="small-label">02 · СОНССОНОО БОЛОВСРУУЛАХ</p>
                  <h3>Хариултаа өөрийн үгээр бич</h3>
                  <p className="form-intro">Зөв хариулт хайхгүй. Гол санаа, мэдрэмж, дараагийн асуултыг ялгаж сурах нь зорилго.</p>

                  <label htmlFor="listen-summary"><span>1</span> Гол санаа нь юу байсан бэ?</label>
                  <textarea
                    id="listen-summary"
                    rows={2}
                    value={listeningAnswers.summary}
                    onChange={(event) => setListeningAnswers((current) => ({ ...current, summary: event.target.value }))}
                    placeholder="Тэр хүн ... тухай хэлсэн."
                  />

                  <label htmlFor="listen-feeling"><span>2</span> Ямар мэдрэмж эсвэл хэрэгцээ анзаарав?</label>
                  <textarea
                    id="listen-feeling"
                    rows={2}
                    value={listeningAnswers.feeling}
                    onChange={(event) => setListeningAnswers((current) => ({ ...current, feeling: event.target.value }))}
                    placeholder="Тэр ... байгаа мэт санагдсан, учир нь ..."
                  />

                  <label htmlFor="listen-question"><span>3</span> Нэг нээлттэй асуулт тавибал?</label>
                  <textarea
                    id="listen-question"
                    rows={2}
                    value={listeningAnswers.question}
                    onChange={(event) => setListeningAnswers((current) => ({ ...current, question: event.target.value }))}
                    placeholder="Таны хувьд ... нь ямар байсан бэ?"
                  />

                  <button
                    className="primary-button"
                    disabled={!Object.values(listeningAnswers).every((answer) => answer.trim())}
                    onClick={() => setPracticeStep(2)}
                  >
                    Өөрийгөө үнэлэх <IconArrow />
                  </button>
                </div>
              </div>
            )}

            {practiceStep === 1 && exerciseIndex !== 0 && (
              <div className="workspace-content timer-layout">
                <div className="timer" aria-label={`${timeLabel} үлдсэн`}>
                  <span>{timeLabel}</span>
                  <small>ӨӨРИЙН ХЭМНЭЛЭЭР</small>
                </div>
                <div>
                  <p className="small-label">ДАДЛАГА ХИЙХ</p>
                  <h3>Нэг бодит яриагаа сонго</h3>
                  <p>{exercise.instruction} Хэлэх өгүүлбэрээ чангаар 2–3 удаа давтаарай.</p>
                  <div className="button-row">
                    <button className="primary-button" onClick={() => setTimerRunning(!timerRunning)}>
                      {timerRunning ? "Түр зогсоох" : seconds < 300 ? "Үргэлжлүүлэх" : "Цаг эхлүүлэх"}
                    </button>
                    <button className="text-button" onClick={() => { setTimerRunning(false); setPracticeStep(2); }}>
                      Дүгнэх <IconArrow />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {practiceStep === 2 && (
              <div className="workspace-content">
                <span className="step-number">03</span>
                <div className="reflection-form">
                  <p className="small-label">ДҮГНЭХ</p>
                  <h3>{exercise.reflection}</h3>
                  <label>Өөрийгөө үнэлээрэй</label>
                  <div className="rating" role="group" aria-label="1-ээс 5 хүртэл үнэлэх">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        type="button"
                        className={rating === value ? "selected" : ""}
                        aria-pressed={rating === value}
                        onClick={() => setRating(value)}
                        key={value}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <label htmlFor="reflection">Нэг өгүүлбэрийн тэмдэглэл <span>(заавал биш)</span></label>
                  <textarea
                    id="reflection"
                    value={reflection}
                    onChange={(event) => setReflection(event.target.value)}
                    placeholder="Дараагийн удаа би..."
                    rows={3}
                  />
                  <button className="primary-button" disabled={!rating} onClick={saveSession}>
                    Ахицдаа хадгалах <IconArrow />
                  </button>
                </div>
              </div>
            )}

            {practiceStep === 3 && (
              <div className="success-state">
                <span aria-hidden="true">✓</span>
                <p className="small-label">ӨНӨӨДРИЙН ДАВТАЛТ БҮРТГЭГДЛЭЭ</p>
                <h3>Сайн ажиллалаа.</h3>
                <p>Дараагийн бодит яриандаа энэ нэг өгүүлбэрийг туршаад үзээрэй.</p>
                <button className="text-button" onClick={() => chooseExercise((exerciseIndex + 1) % exercises.length)}>
                  Өөр дасгал сонгох <IconArrow />
                </button>
              </div>
            )}
          </article>
        )}
      </section>
      )}

      {view === "journey" && (
        <section className="journey-page section-shell" aria-labelledby="journey-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ТАНЫ 7 ӨДРИЙН ЗАМНАЛ</p>
              <h1 id="journey-title">Нэг чадварыг өдөр бүр бататга</h1>
            </div>
            <p>Өнөөдрийн алхам, дууссан өдрүүд болон дараагийн жижиг давталтаа нэг дороос харна.</p>
          </div>
          {plan ? (
            <>
              <article className="journey-summary-card">
                <div><span>ӨНӨӨДӨР</span><strong>Өдөр {plan.currentDay}/7 · {todayPlanDay?.title}</strong><p>{todayPlanDay?.reason}</p></div>
                <a className="primary-button" href="/today">Өнөөдрийн дасгал руу <IconArrow /></a>
              </article>
              <ol className="journey-days">
                {plan.days.map((day) => {
                  const completion = plan.completions.find((item) => item.day === day.day);
                  const status = completion ? "completed" : day.day === plan.currentDay ? "today" : "next";
                  return (
                    <li key={day.day} className={status}>
                      <span>{completion ? "✓" : day.day}</span>
                      <div><b>{day.title}</b><small>{day.skill}</small></div>
                      <em>{completion ? completion.date : status === "today" ? "Өнөөдөр" : "Дараа"}</em>
                    </li>
                  );
                })}
              </ol>
            </>
          ) : (
            <article className="journey-empty">
              <h2>Таны зам хараахан үүсээгүй байна</h2>
              <p>Өнөөдрийн хэсэгт гурван богино сонголт хийж хувийн 7 өдрийн замаа эхлүүлээрэй.</p>
              <a className="primary-button" href="/today">Замаа эхлүүлэх</a>
            </article>
          )}
        </section>
      )}

      {view === "progress" && (
      <section className="progress-section section-shell" id="progress">
        <div className="progress-copy">
          <p className="eyebrow">ТАНЫ АХИЦ</p>
          <h2>Төгс биш, тогтвортой</h2>
          <p>
            Нэг өдөрт нэг жижиг харилцааг илүү сайн хийхэд л төвлөр. Таны ахиц зөвхөн энэ төхөөрөмж дээр хадгалагдана.
          </p>
        </div>
        <div className="progress-stats">
          <div><strong>{progress.sessions + arenaProgress.sessions}</strong><span>нийт session</span></div>
          <div><strong>{streak}</strong><span>өдрийн дараалал</span></div>
          <div><strong>{arenaProgress.meaningfulRepetitions}</strong><span>утгатай давталт</span></div>
          <div><strong>{xp}</strong><span>нийт XP</span></div>
        </div>
        <div className="weekly-card">
          <div>
            <span>ЭНЭ ДОЛОО ХОНОГ</span>
            <strong>{week.filter((day) => day.done).length} / 7 өдөр</strong>
          </div>
          <div className="large-week">
            {week.map((day) => (
              <div key={day.key} className={day.done ? "done" : ""}>
                <i>{day.done ? "✓" : ""}</i><span>{day.label}</span>
              </div>
            ))}
          </div>
        </div>
        {plan && weeklyReport && (
          <article className={`weekly-report ${plan.status === "completed" ? "complete" : ""}`}>
            <div>
              <span>{plan.status === "completed" ? "7 ӨДРИЙН ТАЙЛАН" : "ЭНЭ ЗАМЫН АХИЦ"}</span>
              <h3>{plan.completions.length} дасгал хийсэн</h3>
              <p>{plan.status === "completed" ? "Та долоо хоногийн замаа дуусгалаа. Өмнөх ахиц тань хадгалагдсан." : "Өнөөдөр амжаагүй байсан ч шийтгэлгүй. Нэг богино дасгалаар үргэлжлүүлээрэй."}</p>
            </div>
            <dl>
              <div><dt>Хамгийн их давтсан чадвар</dt><dd>{weeklyReport.topSkill}</dd></div>
              <div><dt>Өөрийн үнэлгээний өөрчлөлт</dt><dd>{weeklyReport.ratingChange === null ? "Үнэлгээ цугларч байна" : `${weeklyReport.ratingChange >= 0 ? "+" : ""}${weeklyReport.ratingChange.toFixed(1)}`}</dd></div>
              <div><dt>AI-ийн ажигласан сайн тал</dt><dd>Дахин оролдож, санаагаа товчлох</dd></div>
              <div><dt>Дараагийн анхаарах чадвар</dt><dd>{plan.days[Math.min(plan.currentDay, 6)].skill}</dd></div>
            </dl>
          </article>
        )}
        <div className="arena-progress-card">
          <div><span>БАГИЙН ӨДРИЙН ХООЛ</span><strong>Recovery Strength</strong><p>Өөр өдөр бүрэн сэргээх мөчийг давтахад батжина.</p></div>
          <div className="recovery-meter" aria-label={`Recovery Strength ${arenaProgress.recoveryStrength} / 5`}>
            {Array.from({ length: 5 }, (_, index) => <i key={index} className={index < arenaProgress.recoveryStrength ? "active" : ""}>{index < arenaProgress.recoveryStrength ? "✓" : index + 1}</i>)}
          </div>
          <div className="arena-progress-meta"><span>Дээд түвшин <b>{arenaProgress.highestLevel || "—"}</b></span><span>Session <b>{arenaProgress.sessions}</b></span><span>Сүүлийн эрчим <b>{arenaProgress.sessions ? arenaProgress.lastIntensityAfter : "—"}/10</b></span></div>
          {arenaProgress.history.length > 0 && (
            <details className="arena-history">
              <summary>Сүүлийн session-үүдийг харах</summary>
              <div>{arenaProgress.history.slice(0, 5).map((item) => <p key={item.id}><span>{item.date}</span><b>Level {item.level}</b><span>{item.repetitions} давталт</span><span>{item.intensityBefore} → {item.intensityAfter}</span><strong>+{item.xp} XP</strong></p>)}</div>
            </details>
          )}
        </div>
        <div className="beta-metrics-card">
          <div className="beta-metrics-head"><div><span>PRIVATE BETA METRICS</span><strong>Туршилтын чанарын дохио</strong></div><button type="button" onClick={exportBetaData} disabled={!betaEvents.length}>JSON татах</button></div>
          <div className="beta-metrics-grid">
            <div><strong>{sttAcceptanceRate || "—"}{sttAcceptanceRate ? "%" : ""}</strong><span>STT зөв баталсан</span><small>{acceptedTranscripts}/{transcriptEvents.length} хөрвүүлэлт</small></div>
            <div><strong>{averageBetaRating}</strong><span>Feedback үнэлгээ</span><small>{submittedFeedback.length} хариулт</small></div>
            <div><strong>{betaEvents.filter((event) => event.name === "retry_completed").length}</strong><span>Retry completed</span><small>Дахин хэлсэн тоо</small></div>
            <div><strong>{betaEvents.filter((event) => event.name === "control_used" && event.properties.control === "safe_finish").length}</strong><span>Safe finish</span><small>Шийтгэлгүй дуусгалт</small></div>
          </div>
          <p>Эдгээр тоо зөвхөн энэ төхөөрөмжийн сүүлийн 200 event. Татсан файлд аудио болон transcript орохгүй.</p>
        </div>
      </section>
      )}

      <footer className="app-footer">
        <span>Өдөр бүрийн харилцаа</span>
        <p>Өнөөдөр нэг яриагаа илүү сайн болгоё.</p>
        <a href="/today">Өнөөдрийн дасгал</a>
      </footer>

    </main>
  );
}
