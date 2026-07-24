"use client";

import { useEffect, useState } from "react";

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

const scenarios: Scenario[] = [
  {
    id: "work",
    category: "АЖЛЫН ХАРИЛЦАА",
    title: "Санал зөрөлдөөнийг тайван шийдэх",
    description: "Хамтрагч тань таны санааг хурлын үеэр шууд няцаалаа.",
    counterpart: "“Энэ санаа бодитой биш. Ингэж цаг алдах хэрэггүй.”",
    prompt: "Та яаж хариулах вэ?",
    options: [
      { label: "“Яагаад бодитой биш гэж үзэж байгаагаа тодруулж болох уу?”", feedback: "Та хамгаалах байр суурь руу орохгүйгээр шалтгааныг тодрууллаа.", helpful: true },
      { label: "“Та миний санааг хэзээ ч сонсдоггүй.”", feedback: "Ерөнхийлөл нь нөгөө хүнийг хамгаалалтад оруулж магадгүй. Нэг тодорхой баримтаас эхлээрэй.", helpful: false },
      { label: "“За тэгвэл өөрөө мэд.”", feedback: "Яриаг хаах нь асуудлыг үлдээнэ. Нэг нээлттэй асуулт тавиад үзээрэй.", helpful: false },
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
      { label: "“Завгүй байсныг ойлгож байна. Гэхдээ энэ ажил үлдэхээр би ачаалалтай болдог. Одоо хэзээ хийхээ тохиръё.”", feedback: "Та ойлгож байгаагаа хэлээд, нөлөө болон тодорхой хүсэлтээ салгаж илэрхийллээ.", helpful: true },
      { label: "“Чи үргэлж л шалтаг хэлдэг.”", feedback: "Шошголох нь гол асуудлаас холдуулдаг. Нөхцөл → нөлөө → хүсэлт дарааллаар туршаарай.", helpful: false },
      { label: "Дуугүй өнгөрөөнө.", feedback: "Түр зөрчилгүй өнгөрөх ч бухимдал хуримтлагдаж болно. Богино, тодорхой хүсэлт илүү аюулгүй.", helpful: false },
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
      { label: "“Өнөө орой амжуулах боломжгүй. Харин маргааш 20 минут хамт хараад өгч чадна.”", feedback: "Боломжгүй зүйлээ товч хэлээд, хийж чадах бодит хувилбарыг санал болголоо.", helpful: true },
      { label: "“За яах вэ, явуулаад өг.”", feedback: "Хүсээгүй ч зөвшөөрөх нь дараа нь бухимдал үүсгэнэ. Боломжгүйгээ тайлбар ихгүйгээр хэлж болно.", helpful: false },
      { label: "“Надаас дандаа юм гуйхаа боль.”", feedback: "Хил хязгаар хэрэгтэй ч энэ хэлбэр харилцааг хурцатгана. Одоогийн хүсэлтэд төвлөрөөрэй.", helpful: false },
    ],
  },
];

function IconArrow() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

function IconClock() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
}

export function RoleplayPracticeExperience() {
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [roleFeedback, setRoleFeedback] = useState<RoleOption | null>(null);

  useEffect(() => {
    if (!selectedScenario) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedScenario(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedScenario]);

  return (
    <div className="practice-experience practice-view-roleplay">
      <section className="roleplay-section" id="roleplay">
        <div className="section-shell">
          <div className="section-heading inverse">
            <div><p className="eyebrow">ДҮРД ТОГЛОЖ ДАДЛАГА ХИЙХ</p><h1>Хэлэхээсээ өмнө туршаад үз</h1></div>
            <p>Хариулт бүрийн дараа богино тайлбар авч, өөр хувилбарыг аюулгүй орчинд туршина.</p>
          </div>
          <div className="scenario-grid">
            {scenarios.map((scenario, index) => (
              <button className="scenario-card" type="button" key={scenario.id} onClick={() => { setSelectedScenario(scenario); setRoleFeedback(null); }}>
                <span className={`scenario-number tone-${index + 1}`}>0{index + 1}</span>
                <small>{scenario.category}</small><h2>{scenario.title}</h2><p>{scenario.description}</p>
                <span className="scenario-meta"><IconClock /> 3–5 мин <IconArrow /></span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {selectedScenario && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedScenario(null); }}>
          <section className="role-dialog" role="dialog" aria-modal="true" aria-labelledby="role-title">
            <button className="dialog-close" type="button" aria-label="Хаах" onClick={() => setSelectedScenario(null)}>×</button>
            <p className="small-label">{selectedScenario.category}</p>
            <h2 id="role-title">{selectedScenario.title}</h2>
            <div className="speech counterpart"><span>НӨГӨӨ ХҮН</span><p>{selectedScenario.counterpart}</p></div>
            <h3>{selectedScenario.prompt}</h3>
            <div className="role-options">
              {selectedScenario.options.map((option) => (
                <button type="button" className={roleFeedback === option ? (option.helpful ? "helpful" : "try-again") : ""} onClick={() => setRoleFeedback(option)} key={option.label}>{option.label}</button>
              ))}
            </div>
            {roleFeedback && (
              <div className={`coach-feedback ${roleFeedback.helpful ? "helpful" : "try-again"}`} aria-live="polite">
                <b>{roleFeedback.helpful ? "Сайн сонголт" : "Өөрөөр туршаад үзье"}</b><p>{roleFeedback.feedback}</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
