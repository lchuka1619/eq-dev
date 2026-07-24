"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { MediaPreview } from "@/components/personal-practice/media-preview";
import {
  deleteCloudRepair,
  hydratePersonalPractice,
  syncBridgeChoice,
  syncPersonalPractice,
} from "@/lib/personal-practice/cloud-practice";
import {
  clearPersonalPracticeRepair,
  emptyPersonalPracticeState,
  readPersonalPracticeState,
  writePersonalPracticeState,
  type PersonalPracticeState,
  type RepairDraft,
} from "@/lib/personal-practice/persistence";
import {
  TARGET_SKILL_ID,
  createVariation,
  decideProgression,
  evaluatePracticeResponse,
  safeStageForIntensity,
  type RehearsalStage,
  type SceneRenderer,
} from "@/lib/personal-practice/variation-engine";

type Step = "intro" | "repair" | "media" | "practice" | "result";

const stageLabels: Record<RehearsalStage, string> = {
  guided: "Guided",
  prompted: "Prompted",
  independent: "Independent",
  "light-surprise": "Light surprise",
  "connected-rehearsal": "Connected rehearsal",
};

const blankRepair: RepairDraft = {
  moments: ["Эвентэд ирэх", "Жижиг бүлэгт зогсох", "Санаа хэлэх мөч"],
  selectedMoment: "Санаа хэлэх мөч",
  fact: "",
  conclusion: "",
  saveChoice: "device",
};

export function PersonalPracticePilot() {
  const { user, setSyncState } = useAuth();
  const [state, setState] = useState<PersonalPracticeState>(() => emptyPersonalPracticeState(TARGET_SKILL_ID));
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>("intro");
  const [repair, setRepair] = useState<RepairDraft>(blankRepair);
  const [anxietyBefore, setAnxietyBefore] = useState(4);
  const [anxietyAfter, setAnxietyAfter] = useState(4);
  const [response, setResponse] = useState("");
  const [reflection, setReflection] = useState("");
  const [usedHint, setUsedHint] = useState(false);
  const [safeFinished, setSafeFinished] = useState(false);
  const [mediaMode, setMediaMode] = useState<Extract<SceneRenderer, "text_voice" | "image_audio">>("image_audio");
  const hydratedUser = useRef<string | null>(null);
  const activeStage = safeStageForIntensity(state.stage, anxietyBefore);
  const variation = useMemo(
    () => createVariation(state.journeyId, activeStage, state.attempts.length, mediaMode),
    [activeStage, mediaMode, state.attempts.length, state.journeyId],
  );
  const feedback = useMemo(() => evaluatePracticeResponse(response), [response]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = readPersonalPracticeState(TARGET_SKILL_ID);
      setState(saved);
      if (saved.repair) setRepair(saved.repair);
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!user) {
      hydratedUser.current = null;
      return;
    }
    if (!ready || hydratedUser.current === user.id) return;
    hydratedUser.current = user.id;
    setSyncState("syncing");
    void hydratePersonalPractice(user.id, state)
      .then((hydrated) => {
        setState(hydrated);
        if (hydrated.repair) setRepair(hydrated.repair);
        writePersonalPracticeState(hydrated);
        setSyncState("synced");
      })
      .catch(() => setSyncState("pending"));
  }, [ready, setSyncState, state, user]);

  useEffect(() => {
    const startFromToday = (event: Event) => {
      const route = (event as CustomEvent<{ route?: string }>).detail?.route;
      setStep(route === "past_repair" ? "repair" : "media");
    };
    window.addEventListener("eq:start-personal-practice", startFromToday);
    return () => window.removeEventListener("eq:start-personal-practice", startFromToday);
  }, []);

  const saveState = (next: PersonalPracticeState) => {
    setState(next);
    writePersonalPracticeState(next);
  };

  const beginRepair = () => {
    setStep("repair");
    document.getElementById("personal-practice-pilot")?.scrollIntoView({ behavior: "smooth" });
  };

  const continueFromRepair = (choice: RepairDraft["saveChoice"]) => {
    const nextRepair = { ...repair, saveChoice: choice };
    setRepair(nextRepair);
    const next = { ...state, repair: choice === "none" ? null : nextRepair };
    saveState(next);
    setStep("media");
  };

  const deleteRepair = async () => {
    const next = clearPersonalPracticeRepair(state);
    setState(next);
    setRepair(blankRepair);
    if (user) {
      setSyncState("syncing");
      const ok = await deleteCloudRepair(user.id, state.journeyId);
      setSyncState(ok ? "synced" : "pending");
    }
  };

  const finishAttempt = async (safe = false) => {
    const completedAt = new Date().toISOString();
    const evidence = {
      stage: activeStage,
      completed: !safe && Boolean(response.trim()),
      safeFinished: safe,
      usedHint,
      anxietyBefore,
      anxietyAfter,
      completedAt,
      variationId: variation.id,
    };
    const history = state.attempts.map((item) => ({
      ...item,
      variationId: item.variation.id,
    }));
    const decision = decideProgression([...history, evidence], activeStage, {
      allowSurprise: state.surpriseOptIn,
    });
    const attempt = {
      ...evidence,
      id: crypto.randomUUID(),
      variation,
      response: response.trim(),
      reflection: reflection.trim(),
      decision: decision.decision,
      completedAt,
    };
    const next = {
      ...state,
      stage: decision.nextStage,
      attempts: [...state.attempts, attempt],
    };
    setSafeFinished(safe);
    saveState(next);
    setStep("result");
    if (user) {
      setSyncState("syncing");
      const ok = await syncPersonalPractice(user.id, next, attempt);
      setSyncState(ok ? "synced" : "pending");
    }
  };

  const repeat = () => {
    setResponse("");
    setReflection("");
    setUsedHint(false);
    setSafeFinished(false);
    setAnxietyBefore(anxietyAfter);
    setStep("practice");
  };

  const chooseBridge = async (accepted: boolean) => {
    const next = { ...state, bridgeAccepted: accepted };
    saveState(next);
    if (user) {
      setSyncState("syncing");
      const ok = await syncBridgeChoice(user.id, next, accepted);
      setSyncState(ok ? "synced" : "pending");
    }
  };

  const setSurpriseOptIn = (accepted: boolean) => {
    saveState({ ...state, surpriseOptIn: accepted });
  };

  if (!ready) return null;

  return (
    <section className="personal-pilot section-shell" id="personal-practice-pilot" aria-labelledby="personal-pilot-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">PERSONAL PRACTICE PILOT</p>
          <h2 id="personal-pilot-title">Өмнөх мөчөөс дараагийн оролцоонд</h2>
        </div>
        <p>Нэг чадвараа хадгалж, нөхцөлийг бага багаар өөрчлөн давтана.</p>
      </div>

      {step === "intro" && (
        <article className="pilot-card pilot-intro">
          <div>
            <span className="pilot-stage">Байгууллагын ideation / event</span>
            <h3>Санаагаа ярианд тайван оруулах</h3>
            <p>Өмнөх таагүй мөчийг бүхэлд нь шинжлэхгүй. Нэг жижиг мөч сонгоод, дараагийн удаа хэрэглэх хариугаа аюулгүй давтана.</p>
            <p className="safety-note">Энэ нь онош эсвэл trauma treatment биш. Хуримтлагдсан таагүй туршлага нөлөөлж байж болохыг зөөлөн ажиглах дасгал.</p>
          </div>
          <button className="primary-button" type="button" onClick={beginRepair}>Pilot дасгал эхлэх</button>
        </article>
      )}

      {step === "repair" && (
        <article className="pilot-card repair-card">
          <div className="pilot-step"><b>1</b><span>Past Event Repair<small>Хүссэн үедээ алгасаж болно</small></span></div>
          <h3>Өмнөх эвентийн нэг жижиг мөчийг сонгоё</h3>
          <div className="moment-grid">
            {repair.moments.map((moment) => (
              <button type="button" key={moment} className={repair.selectedMoment === moment ? "selected" : ""} aria-pressed={repair.selectedMoment === moment} onClick={() => setRepair({ ...repair, selectedMoment: moment })}>{moment}</button>
            ))}
          </div>
          <div className="fact-grid">
            <label>Камер бичсэн бол харагдах баримт
              <textarea value={repair.fact} onChange={(event) => setRepair({ ...repair, fact: event.target.value })} rows={3} placeholder="Жишээ: Би нэг санаа хэлэхээр амаа нээсэн ч өөр хүн түрүүлж ярьсан." />
            </label>
            <label>Тэр үед төрсөн ерөнхий дүгнэлт
              <textarea value={repair.conclusion} onChange={(event) => setRepair({ ...repair, conclusion: event.target.value })} rows={3} placeholder="Жишээ: Миний санааг хэн ч сонсохгүй юм байна гэж бодсон." />
            </label>
          </div>
          <p className="privacy-note">Та энэ мэдээллийг хадгалахгүй үргэлжлүүлж болно. Cloud сонголт зөвхөн нэвтэрсэн үед ажиллана.</p>
          <div className="pilot-actions">
            <button type="button" className="text-button" onClick={() => continueFromRepair("none")}>Алгасаад үргэлжлүүлэх</button>
            <button type="button" className="secondary-button" onClick={() => continueFromRepair("device")}>Зөвхөн төхөөрөмжид хадгалах</button>
            <button type="button" className="primary-button" disabled={!user} title={!user ? "Cloud-д хадгалахын тулд нэвтэрнэ үү" : undefined} onClick={() => continueFromRepair("cloud")}>Cloud-д хадгалаад үргэлжлүүлэх</button>
          </div>
          {state.repair && <button type="button" className="danger-link" onClick={deleteRepair}>Өмнөх хадгалсан repair-ийг устгах</button>}
        </article>
      )}

      {step === "practice" && (
        <article className="pilot-card rehearsal-card">
          <div className="pilot-step"><b>3</b><span>{stageLabels[activeStage]} rehearsal<small>Чадвар: санаагаа тодорхой оруулах · {mediaMode === "image_audio" ? "image + optional audio" : "text-only"}</small></span></div>
          {state.stage === "light-surprise" && activeStage !== state.stage && (
            <p className="safe-recommendation">Түгшүүр 8–10 байгаа тул Light surprise-ийг түр хойшлуулж, Independent шатанд зөөлрүүллээ.</p>
          )}
          {state.stage === "independent" && (
            <label className="surprise-opt-in">
              <input type="checkbox" checked={state.surpriseOptIn} onChange={(event) => setSurpriseOptIn(event.target.checked)} />
              Тогтвортой болсны дараа нэг хөнгөн гэнэтийн хувилбар туршихыг зөвшөөрөх
            </label>
          )}
          <div className="variation-meta">
            <span>{variation.environment}</span><span>{variation.character}</span><span>{variation.tone}</span>
          </div>
          <p className="scene-line">{variation.openingLine}</p>
          {variation.complication !== "гэнэтийн зүйлгүй" && <p className="complication">{variation.complication}</p>}
          <div className="intensity-row">
            <label htmlFor="pilot-before">Эхлэхийн өмнөх түгшүүр</label><b>{anxietyBefore}/10</b>
            <input id="pilot-before" type="range" min="0" max="10" value={anxietyBefore} onChange={(event) => setAnxietyBefore(Number(event.target.value))} />
          </div>
          <h3>{variation.prompt}</h3>
          <button type="button" className="hint-toggle" aria-expanded={usedHint} onClick={() => setUsedHint(!usedHint)}>◇ {usedHint ? "Hint нуух" : "Hint харах"}</button>
          {usedHint && <div className="pilot-hint"><b>Хариултын бүтэц</b><p>{variation.promptSupport}</p><p>{variation.responseFrame}</p></div>}
          <label htmlFor="pilot-response">Таны хэлэх хариулт</label>
          <textarea id="pilot-response" rows={4} value={response} onChange={(event) => setResponse(event.target.value)} placeholder={variation.responseFrame} />
          <label htmlFor="pilot-reflection">Нэг өгүүлбэрийн reflection <span>(заавал биш)</span></label>
          <textarea id="pilot-reflection" rows={2} value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="Энэ удаа би…" />
          <div className="intensity-row">
            <label htmlFor="pilot-after">Одоо түгшүүр ямар байна?</label><b>{anxietyAfter}/10</b>
            <input id="pilot-after" type="range" min="0" max="10" value={anxietyAfter} onChange={(event) => setAnxietyAfter(Number(event.target.value))} />
          </div>
          <div className="pilot-actions">
            <button type="button" className="text-button" onClick={() => void finishAttempt(true)}>Энд аюулгүй дуусгах</button>
            <button type="button" className="primary-button" disabled={!response.trim()} onClick={() => void finishAttempt(false)}>Давталтыг дуусгах</button>
          </div>
        </article>
      )}

      {step === "media" && (
        <MediaPreview
          intensity={anxietyBefore}
          onBack={() => setStep(state.repair ? "repair" : "intro")}
          onTextOnly={() => {
            setMediaMode("text_voice");
            setStep("practice");
          }}
          onContinue={() => {
            setMediaMode("image_audio");
            setStep("practice");
          }}
        />
      )}

      {step === "result" && (
        <article className="pilot-card pilot-result" aria-live="polite">
          <span className="complete-mark">{safeFinished ? "Ⅱ" : "✓"}</span>
          <h3>{safeFinished ? "Энд зогссон нь зөв сонголт." : "Нэг утгатай давталт дууслаа."}</h3>
          <p>{state.attempts.at(-1)?.decision === "pause"
            ? "Өнөөдөр энд амраад, дараа нь ижил эсвэл зөөлөн хувилбараас үргэлжлүүлнэ."
            : state.attempts.at(-1)?.decision === "consolidate"
              ? "Шинэ шатны чадвараа нэг танил хувилбараар тогтворжуулна."
              : state.stage === "guided"
                ? "Ижил дэмжлэгтэй, өөр жижиг нөхцөлөөр давтана."
                : `Дараагийн шат: ${stageLabels[state.stage]}.`}</p>
          {!safeFinished && (
            <div className="pilot-feedback">
              <div className="feedback-line good"><b>✓ Сайн болсон</b><p>{feedback.positive}</p></div>
              <div className="feedback-line improve"><b>→ Нэг сайжруулалт</b><p>{feedback.improve}</p></div>
            </div>
          )}
          <div className="result-stats"><span><b>{state.attempts.length}</b> нийт оролдлого</span><span><b>{anxietyBefore} → {anxietyAfter}</b> түгшүүр</span><span><b>{variation.changedDimensions.length}</b> өөрчилсөн хувьсагч</span></div>
          {Math.max(anxietyBefore, anxietyAfter) < 8 && <div className="bridge-card">
            <p className="eyebrow">OPTIONAL REAL-LIFE BRIDGE</p>
            <h4>Дараагийн уулзалтаас өмнө эхний нэг өгүүлбэрээ notes-д бичих үү?</h4>
            <p>Хэнд ч илгээх шаардлагагүй. Алгассан ч streak болон ахиц буурахгүй.</p>
            <button type="button" className="secondary-button" onClick={() => void chooseBridge(true)}>Тийм, жижиг алхмыг сонгох</button>
            <button type="button" className="text-button" onClick={() => void chooseBridge(false)}>Одоохондоо алгасах</button>
          </div>}
          <div className="pilot-actions">
            <button type="button" className="primary-button" onClick={repeat}>Өөр жижиг хувилбараар давтах</button>
            <button type="button" className="text-button" onClick={() => setStep("intro")}>Дуусгах</button>
          </div>
        </article>
      )}
    </section>
  );
}
