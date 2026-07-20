"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type VoicePhase = "ready" | "respond" | "feedback" | "retry" | "complete";
type VoiceFeedback = { positive: string; improve: string };
type SpeechResultEvent = { results: { [index: number]: { [index: number]: { transcript: string } } } };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type Progress = {
  completedDates: string[];
  sessions: number;
  lastRating: number;
};

type RoleOption = {
  label: string;
  feedback: string;
  helpful: boolean;
};

type Scenario = {
  id: string;
  category: string;
  title: string;
  description: string;
  counterpart: string;
  prompt: string;
  options: RoleOption[];
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

const scenarios: Scenario[] = [
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

const emptyProgress: Progress = {
  completedDates: [],
  sessions: 0,
  lastRating: 0,
};

const defaultVideoId = "aDMtx5ivKK0";
const coachLine = "Өнөөдөр төлөвлөсөн ажлаа амжуулаагүй болохоор жаахан сэтгэлээр уначихлаа.";

function evaluateResponse(value: string): VoiceFeedback {
  const text = value.toLocaleLowerCase("mn-MN");
  const hasMeaning = ["ажил", "амжуулаагүй", "амжаагүй"].some((word) => text.includes(word));
  const hasEmotion = ["сэтгэл", "урам", "хэцүү", "санаа", "уначих"].some((word) => text.includes(word));
  const hasQuestion = ["юу", "яаж", "аль", "ямар", "хэзээ", "хаана", "?"].some((word) => text.includes(word));

  const positive = hasMeaning && hasEmotion
    ? "Та болсон зүйл болон мэдрэмжийг хоёуланг нь анзаарлаа."
    : hasMeaning
      ? "Та ярианы гол утгыг зөв барьж авлаа."
      : hasQuestion
        ? "Та яриаг үргэлжлүүлэх нээлттэй орон зай гаргалаа."
        : "Та шууд хариулах зоригтой алхам хийлээ.";

  const improve = !hasEmotion
    ? "Дараагийн удаа мэдрэмжийг нэрлээрэй: “сэтгэлээр унасан юм байна”."
    : !hasQuestion
      ? "Төгсгөлд нь “Яг аль хэсэг нь хамгийн хэцүү байв?” гэх нээлттэй асуулт нэмээрэй."
      : "Сайн бүтэцтэй байна. Одоо “жаахан” гэх хүний өөрийн үгийг хадгалаад илүү товч хэлээрэй.";

  return { positive, improve };
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

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export default function Home() {
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [practiceStep, setPracticeStep] = useState(0);
  const [seconds, setSeconds] = useState(300);
  const [timerRunning, setTimerRunning] = useState(false);
  const [rating, setRating] = useState(0);
  const [reflection, setReflection] = useState("");
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [roleFeedback, setRoleFeedback] = useState<RoleOption | null>(null);
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
  const [voiceResponse, setVoiceResponse] = useState("");
  const [firstVoiceResponse, setFirstVoiceResponse] = useState("");
  const [voiceFeedback, setVoiceFeedback] = useState<VoiceFeedback | null>(null);
  const [feedbackSource, setFeedbackSource] = useState<"gemini" | "simulation">("simulation");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micMessage, setMicMessage] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const exercise = exercises[exerciseIndex];
  const streak = calculateStreak(progress.completedDates);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("hariltsaa-progress-v1");
      if (saved) setProgress(JSON.parse(saved));
      const savedVideo = window.localStorage.getItem("hariltsaa-youtube-id-v1");
      if (savedVideo && /^[a-zA-Z0-9_-]{11}$/.test(savedVideo)) setVideoId(savedVideo);
    } catch {
      // The experience still works if browser storage is unavailable.
    }
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

  useEffect(() => {
    if (!selectedScenario) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedScenario(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedScenario]);

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

  const startPractice = () => {
    setPracticeOpen(true);
    setPracticeStep(0);
    setSeconds(300);
    setTimerRunning(false);
    setRating(0);
    window.setTimeout(() => {
      document.getElementById("practice")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const openVoiceCoach = () => {
    document.getElementById("voice-coach")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const playCoachLine = () => {
    setVoicePhase("respond");
    if (!("speechSynthesis" in window)) {
      setMicMessage("Дуугаар унших боломжгүй байна. Дээрх өгүүлбэрийг уншаад хариулаарай.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(coachLine);
    utterance.lang = "mn-MN";
    utterance.rate = 0.86;
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    const speechWindow = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setMicMessage("Энэ хөтөч микрофоноор үг танихгүй байна. Доорх талбарт бичиж хариулаарай.");
      return;
    }
    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = "mn-MN";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      setVoiceResponse(event.results[0][0].transcript);
      setMicMessage("Таны хариултыг буулгалаа. Хянаад илгээнэ үү.");
    };
    recognition.onerror = () => setMicMessage("Дууг таньж чадсангүй. Дахин оролдох эсвэл бичиж болно.");
    recognition.onend = () => setIsListening(false);
    setMicMessage("Сонсож байна… Нэг эсвэл хоёр өгүүлбэрээр хариулаарай.");
    setIsListening(true);
    recognition.start();
  };

  const submitVoiceResponse = async () => {
    if (!voiceResponse.trim()) return;
    setFeedbackLoading(true);
    let result = evaluateResponse(voiceResponse);
    let source: "gemini" | "simulation" = "simulation";
    try {
      const request = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coachLine,
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
      const today = dateKey();
      const next = {
        ...progress,
        completedDates: Array.from(new Set([...progress.completedDates, today])),
        sessions: progress.sessions + 1,
      };
      setProgress(next);
      try { window.localStorage.setItem("hariltsaa-progress-v1", JSON.stringify(next)); } catch {}
      setVoicePhase("complete");
    } else {
      setFirstVoiceResponse(voiceResponse.trim());
      setVoicePhase("feedback");
    }
  };

  const beginRetry = () => {
    setVoiceResponse("");
    setMicMessage("");
    setVoicePhase("retry");
  };

  const resetVoiceCoach = () => {
    recognitionRef.current?.stop();
    setVoicePhase("ready");
    setVoiceResponse("");
    setFirstVoiceResponse("");
    setVoiceFeedback(null);
    setFeedbackSource("simulation");
    setFeedbackLoading(false);
    setMicMessage("");
  };

  const chooseExercise = (index: number) => {
    setExerciseIndex(index);
    setPracticeOpen(false);
    setPracticeStep(0);
    setTimerRunning(false);
    setSeconds(300);
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
    setPracticeStep(3);
  };

  const timeLabel = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Нүүр хэсэг">
          <span className="brand-mark">Ө</span>
          <span>Өдөр бүрийн харилцаа</span>
        </a>
        <nav aria-label="Үндсэн цэс">
          <a href="#voice-coach">AI дадлага</a>
          <a href="#roleplay">Дүрд тоглох</a>
          <a href="#progress">Ахиц</a>
        </nav>
        <div className="profile-dot" aria-label="Хэрэглэгч">Ч</div>
      </header>

      <section className="hero" id="top">
        <div className="leaf leaf-left" aria-hidden="true" />
        <div className="leaf leaf-right" aria-hidden="true" />
        <div className="hero-main">
          <p className="eyebrow">ӨНӨӨДРИЙН ЗОРИЛГО</p>
          <h1>Сонсож ойлгоод,<br />тодорхой хариулъя</h1>
          <p className="hero-copy">
            Өдөр бүр бага багаар урагшилж, харилцаагаа илүү ойлгомжтой,
            тайван, үр дүнтэй болгоорой.
          </p>

          <article className="featured-practice">
            <div>
              <p className="card-kicker">1 МИНУТЫН МИКРО ДАСГАЛ</p>
              <h2>AI-тай богино ярилцах</h2>
              <div className="mini-steps" aria-label="Дасгалын 3 алхам">
                <span><b>1</b> Сонсох</span>
                <span><b>2</b> Хариулах</span>
                <span><b>3</b> Дахин хэлэх</span>
              </div>
            </div>
            <button className="primary-button light" onClick={openVoiceCoach}>
              1 минут турших <IconArrow />
            </button>
          </article>
        </div>

        <aside className="streak-card" aria-label="Энэ долоо хоногийн ахиц">
          <div className="streak-head">
            <div>
              <p className="small-label">ТАНЫ АХИЦ</p>
              <strong>{streak} өдөр</strong>
            </div>
            <span className="flame" aria-hidden="true">●</span>
          </div>
          <div className="week-bars">
            {week.map((day) => (
              <div className="week-day" key={day.key}>
                <span>{day.label}</span>
                <i className={day.done ? "done" : day.today ? "today" : ""} />
              </div>
            ))}
          </div>
          <div className="weekly-summary">
            Энэ долоо хоногт <b>{week.filter((day) => day.done).length}/7</b>
          </div>
        </aside>
      </section>

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
              <li className={voicePhase === "complete" ? "done" : voicePhase === "retry" ? "active" : ""}><b>3</b><span>Дахин хэлэх<small>Нэг сайжруулалт</small></span></li>
            </ol>

            <article className="voice-stage" aria-live="polite">
              <div className={`simulation-badge ${feedbackSource === "gemini" ? "connected" : ""}`}>
                <i /> {feedbackSource === "gemini" ? "Gemini AI · холбогдсон" : "Gemini бэлэн · fallback хамгаалалттай"}
              </div>

              {voicePhase === "ready" && (
                <div className="voice-intro">
                  <span className="coach-avatar">AI</span>
                  <p className="small-label">ИДЭВХТЭЙ СОНСОХ · 1 МИНУТ</p>
                  <h3>Зөвлөгөө өгөхөөсөө өмнө ойлгосноо буцааж хэл.</h3>
                  <p>Бэлэн болмогц богино яриаг сонсоно. Тэмдэглэл хийх шаардлагагүй.</p>
                  <button className="primary-button" onClick={playCoachLine}>▶ Яриаг сонсох</button>
                </div>
              )}

              {(voicePhase === "respond" || voicePhase === "retry") && (
                <div className="voice-response">
                  <div className="coach-bubble">
                    <span>ДАСГАЛЖУУЛАГЧ</span>
                    <p>“{coachLine}”</p>
                    <button type="button" onClick={playCoachLine}>↻ Дахин сонсох</button>
                  </div>
                  <p className="response-prompt">Та юу гэж хариулах вэ?</p>
                  <div className="response-actions">
                    <button className={`mic-button ${isListening ? "listening" : ""}`} type="button" onClick={startListening} disabled={isListening}>
                      <span>●</span>{isListening ? "Сонсож байна…" : "Микрофоноор хариулах"}
                    </button>
                    <span>эсвэл</span>
                  </div>
                  <label htmlFor="voice-response">Хариултаа бичих</label>
                  <textarea id="voice-response" rows={3} value={voiceResponse} onChange={(event) => setVoiceResponse(event.target.value)} placeholder="Жишээ: Сэтгэлээр унасан юм байна. Яг аль хэсэг нь хэцүү байв?" />
                  {micMessage && <p className="mic-message">{micMessage}</p>}
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
                  <button className="primary-button" onClick={beginRetry}>Нэг удаа дахин хэлэх <IconArrow /></button>
                </div>
              )}

              {voicePhase === "complete" && (
                <div className="voice-complete">
                  <span>✓</span>
                  <p className="small-label">1 МИНУТЫН ДАСГАЛ ДУУСЛАА</p>
                  <h3>Өнөөдрийн жижиг ялалт.</h3>
                  <p>Та сонсож, хариулж, зөвлөгөөг ашиглан дахин хэллээ. Энэ бол бодит ярианд шилжих хамгийн богино давталт.</p>
                  <button className="text-button" onClick={resetVoiceCoach}>Дахин хийх <IconArrow /></button>
                </div>
              )}
            </article>
          </div>
        </div>
      </section>

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

      <section className="roleplay-section" id="roleplay">
        <div className="section-shell">
          <div className="section-heading inverse">
            <div>
              <p className="eyebrow">ДҮРД ТОГЛОЖ ДАДЛАГА ХИЙХ</p>
              <h2>Хэлэхээсээ өмнө туршаад үз</h2>
            </div>
            <p>Хариулт бүрийн дараа богино тайлбар авч, өөр хувилбарыг аюулгүй орчинд туршина.</p>
          </div>
          <div className="scenario-grid">
            {scenarios.map((scenario, index) => (
              <button
                className="scenario-card"
                type="button"
                key={scenario.id}
                onClick={() => { setSelectedScenario(scenario); setRoleFeedback(null); }}
              >
                <span className={`scenario-number tone-${index + 1}`}>0{index + 1}</span>
                <small>{scenario.category}</small>
                <h3>{scenario.title}</h3>
                <p>{scenario.description}</p>
                <span className="scenario-meta"><IconClock /> 3–5 мин <IconArrow /></span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="progress-section section-shell" id="progress">
        <div className="progress-copy">
          <p className="eyebrow">ТАНЫ АХИЦ</p>
          <h2>Төгс биш, тогтвортой</h2>
          <p>
            Нэг өдөрт нэг жижиг харилцааг илүү сайн хийхэд л төвлөр. Таны ахиц зөвхөн энэ төхөөрөмж дээр хадгалагдана.
          </p>
        </div>
        <div className="progress-stats">
          <div><strong>{progress.sessions}</strong><span>нийт дасгал</span></div>
          <div><strong>{streak}</strong><span>өдрийн дараалал</span></div>
          <div><strong>{progress.lastRating || "—"}</strong><span>сүүлийн үнэлгээ</span></div>
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
      </section>

      <footer>
        <span>Өдөр бүрийн харилцаа</span>
        <p>Өнөөдөр нэг яриагаа илүү сайн болгоё.</p>
        <a href="#top">Дээш очих ↑</a>
      </footer>

      {selectedScenario && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedScenario(null);
        }}>
          <section className="role-dialog" role="dialog" aria-modal="true" aria-labelledby="role-title">
            <button className="dialog-close" aria-label="Хаах" onClick={() => setSelectedScenario(null)}>×</button>
            <p className="small-label">{selectedScenario.category}</p>
            <h2 id="role-title">{selectedScenario.title}</h2>
            <div className="speech counterpart">
              <span>НӨГӨӨ ХҮН</span>
              <p>{selectedScenario.counterpart}</p>
            </div>
            <h3>{selectedScenario.prompt}</h3>
            <div className="role-options">
              {selectedScenario.options.map((option) => (
                <button
                  type="button"
                  className={roleFeedback === option ? (option.helpful ? "helpful" : "try-again") : ""}
                  onClick={() => setRoleFeedback(option)}
                  key={option.label}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {roleFeedback && (
              <div className={`coach-feedback ${roleFeedback.helpful ? "helpful" : "try-again"}`} aria-live="polite">
                <b>{roleFeedback.helpful ? "Сайн сонголт" : "Өөрөөр туршаад үзье"}</b>
                <p>{roleFeedback.feedback}</p>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
