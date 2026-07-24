"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { MediaPreview } from "@/components/personal-practice/media-preview";
import { ConnectedRehearsal } from "@/components/personal-practice/connected-rehearsal";
import {
  deleteCloudRepair,
  hydratePersonalPractice,
  syncBridgeLifecycle,
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
  canUseLightSurprise,
  createVariation,
  decideProgression,
  safeStageForIntensity,
  type RehearsalStage,
  type SceneRenderer,
} from "@/lib/personal-practice/variation-engine";
import {
  contextForStorage,
  normalizePracticeContext,
  type ContextSaveChoice,
  type PracticeContext,
} from "@/lib/context-to-mastery/practice-context";
import { contextualizeVariation } from "@/lib/context-to-mastery/context-scene";
import {
  criterionImproved,
  demonstratedCriterionCount,
  evaluatePracticeResponse,
  type SkillCriterionId,
} from "@/lib/context-to-mastery/skill-rubric";
import { trackLearningEvent } from "@/lib/analytics/learning-events";

type Step = "intro" | "bridge-reflection" | "repair" | "future-context" | "media" | "practice" | "connected" | "result";

type Props = {
  isDaySeven?: boolean;
  onDaySevenComplete?: (before: number, after: number) => void;
  onPracticeFinished?: () => void;
};

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

const blankFutureContext: PracticeContext = {
  entryRoute: "future_rehearsal",
  eventType: "Байгууллагын эвент",
  peopleOrRoles: ["хамтрагч", "багийн ахлах"],
  fearedMoment: "",
  intendedOpening: "",
  desiredAction: "Өмнөх яриатай холбож нэг тодорхой санаа нэмэх",
  intensity: 4,
  saveChoice: "device",
};

export function PersonalPracticePilot({ isDaySeven = false, onDaySevenComplete, onPracticeFinished }: Props) {
  const { user, setSyncState } = useAuth();
  const [state, setState] = useState<PersonalPracticeState>(() => emptyPersonalPracticeState(TARGET_SKILL_ID));
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>("intro");
  const [repair, setRepair] = useState<RepairDraft>(blankRepair);
  const [practiceContext, setPracticeContext] = useState<PracticeContext | null>(null);
  const [futureContext, setFutureContext] = useState<PracticeContext>(blankFutureContext);
  const [anxietyBefore, setAnxietyBefore] = useState(4);
  const [anxietyAfter, setAnxietyAfter] = useState(4);
  const [response, setResponse] = useState("");
  const [reflection, setReflection] = useState("");
  const [usedHint, setUsedHint] = useState(false);
  const [safeFinished, setSafeFinished] = useState(false);
  const [focusedRetry, setFocusedRetry] = useState<{
    attemptId: string;
    criterionId: SkillCriterionId;
  } | null>(null);
  const [mediaMode, setMediaMode] = useState<Extract<SceneRenderer, "text_voice" | "image_audio">>("image_audio");
  const [bridgeDidIt, setBridgeDidIt] = useState<boolean | null>(null);
  const [bridgeBefore, setBridgeBefore] = useState(4);
  const [bridgeAfter, setBridgeAfter] = useState(4);
  const [bridgeReflection, setBridgeReflection] = useState("");
  const [openedAt] = useState(() => new Date().toISOString());
  const hydratedUser = useRef<string | null>(null);
  const activeStage = safeStageForIntensity(state.stage, anxietyBefore);
  const variation = useMemo(
    () => {
      const retryVariation = focusedRetry
        ? state.attempts.find((item) => item.id === focusedRetry.attemptId)?.variation
        : null;
      return retryVariation ?? contextualizeVariation(
        createVariation(state.journeyId, activeStage, state.attempts.length, mediaMode),
        practiceContext,
      );
    },
    [activeStage, focusedRetry, mediaMode, practiceContext, state.attempts, state.journeyId],
  );
  const evaluation = useMemo(() => evaluatePracticeResponse(response), [response]);
  const latestAttempt = state.attempts.at(-1);
  const latestEvaluation = latestAttempt?.evaluation;
  const retryEvaluation = focusedRetry
    ? state.attempts.find((item) => item.id === focusedRetry.attemptId)?.evaluation
    : undefined;
  const lightSurpriseReady = canUseLightSurprise(state.attempts.map((attempt) => ({
    ...attempt,
    variationId: attempt.variation.id,
  })));

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = readPersonalPracticeState(TARGET_SKILL_ID);
      setState(saved);
      if (saved.repair) setRepair(saved.repair);
      if (saved.context) {
        setPracticeContext(saved.context);
        if (saved.context.entryRoute === "future_rehearsal") setFutureContext(saved.context);
      }
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
        if (hydrated.context) {
          setPracticeContext(hydrated.context);
          if (hydrated.context.entryRoute === "future_rehearsal") setFutureContext(hydrated.context);
        }
        writePersonalPracticeState(hydrated);
        setSyncState("synced");
      })
      .catch(() => setSyncState("pending"));
  }, [ready, setSyncState, state, user]);

  useEffect(() => {
    const startFromToday = (event: Event) => {
      const route = (event as CustomEvent<{ route?: string }>).detail?.route;
      setStep(route === "past_repair" ? "repair" : "future-context");
    };
    window.addEventListener("eq:start-personal-practice", startFromToday);
    const initialRoute = new URLSearchParams(window.location.search).get("route");
    const frame = window.requestAnimationFrame(() => {
      if (initialRoute === "past_repair") setStep("repair");
      if (initialRoute === "future_rehearsal") setStep("future-context");
    });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("eq:start-personal-practice", startFromToday);
    };
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
    const context = normalizePracticeContext({
      entryRoute: "past_repair",
      eventType: "Байгууллагын ideation / event",
      decisiveMoment: repair.selectedMoment,
      observableFact: repair.fact,
      conclusion: repair.conclusion,
      desiredAction: "Өмнөх яриатай холбож нэг тодорхой санаа нэмэх",
      intensity: anxietyBefore,
      saveChoice: choice,
    });
    setRepair(nextRepair);
    setPracticeContext(context);
    const next = {
      ...state,
      context: contextForStorage(context),
      repair: choice === "none" ? null : nextRepair,
    };
    saveState(next);
    trackLearningEvent(choice === "none" ? "context_capture_skipped" : "context_capture_completed", {
      entry_route: "past_repair",
      target_skill_id: state.targetSkillId,
      save_choice: choice,
      has_context: Boolean(repair.fact.trim() || repair.conclusion.trim()),
    });
    setStep("media");
  };

  const continueFromFuture = (choice: ContextSaveChoice) => {
    const context = normalizePracticeContext({ ...futureContext, saveChoice: choice });
    setFutureContext(context);
    setPracticeContext(context);
    saveState({ ...state, context: contextForStorage(context) });
    trackLearningEvent("context_capture_completed", {
      entry_route: "future_rehearsal",
      target_skill_id: state.targetSkillId,
      save_choice: choice,
      has_context: Boolean(context.fearedMoment || context.intendedOpening),
    });
    setAnxietyBefore(context.intensity ?? 4);
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
    const attemptStage = focusedRetry ? variation.stage : activeStage;
    const retrySource = focusedRetry
      ? state.attempts.find((item) => item.id === focusedRetry.attemptId)
      : undefined;
    const validAttempt = !safe && evaluation.validAttempt;
    const demonstratedCriteria = validAttempt ? demonstratedCriterionCount(evaluation) : 0;
    const evidence = {
      stage: attemptStage,
      completed: validAttempt,
      safeFinished: safe,
      usedHint,
      anxietyBefore,
      anxietyAfter,
      completedAt,
      variationId: variation.id,
      validAttempt,
      demonstratedCriteria,
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
      evaluation,
      retryOfAttemptId: retrySource?.id,
      focusedCriterionId: focusedRetry?.criterionId,
      criterionImproved: retrySource?.evaluation && focusedRetry
        ? criterionImproved(retrySource.evaluation, evaluation, focusedRetry.criterionId)
        : undefined,
    };
    const next = {
      ...state,
      stage: decision.nextStage,
      attempts: [...state.attempts, attempt],
    };
    setSafeFinished(safe);
    setFocusedRetry(null);
    saveState(next);
    trackLearningEvent("practice_attempt_submitted", {
      entry_route: practiceContext?.entryRoute ?? "daily_skill_loop",
      target_skill_id: state.targetSkillId,
      support_level: attemptStage,
      variant_id: variation.id,
      changed_dimension_count: variation.changedDimensions.length,
    });
    trackLearningEvent("practice_attempt_validity", {
      target_skill_id: state.targetSkillId,
      support_level: attemptStage,
      valid_attempt: validAttempt,
    });
    trackLearningEvent("rubric_evaluated", {
      target_skill_id: state.targetSkillId,
      evaluation_source: evaluation.source,
      criteria_present: demonstratedCriteria,
      valid_attempt: validAttempt,
    });
    trackLearningEvent("mastery_decision", {
      target_skill_id: state.targetSkillId,
      support_level: decision.nextStage,
      decision: decision.decision,
      valid_attempt: validAttempt,
    });
    if (safe) {
      trackLearningEvent("safe_finish_used", {
        target_skill_id: state.targetSkillId,
        support_level: attemptStage,
      });
    }
    if (focusedRetry) {
      trackLearningEvent("focused_retry_completed", {
        target_skill_id: state.targetSkillId,
        support_level: attemptStage,
        focused_criterion_id: focusedRetry.criterionId,
        valid_attempt: validAttempt,
      });
    }
    const wasConfirmedAcrossDays = new Set(state.attempts
      .filter((item) => item.validAttempt)
      .map((item) => item.completedAt.slice(0, 10))).size >= 2;
    const confirmedAcrossDays = new Set(next.attempts
      .filter((item) => item.validAttempt)
      .map((item) => item.completedAt.slice(0, 10))).size >= 2;
    if (!wasConfirmedAcrossDays && confirmedAcrossDays) {
      trackLearningEvent("later_day_confirmation", {
        target_skill_id: state.targetSkillId,
        confirmed_across_days: true,
      });
    }
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
    setFocusedRetry(null);
    setAnxietyBefore(anxietyAfter);
    setStep("practice");
    trackLearningEvent("controlled_variant_started", {
      target_skill_id: state.targetSkillId,
      support_level: state.stage,
    });
  };

  const startFocusedRetry = () => {
    if (!latestAttempt || !latestEvaluation) return;
    setFocusedRetry({
      attemptId: latestAttempt.id,
      criterionId: latestEvaluation.improvementCriterionId,
    });
    setResponse("");
    setReflection("");
    setUsedHint(false);
    setSafeFinished(false);
    setAnxietyBefore(anxietyAfter);
    setStep("practice");
    trackLearningEvent("focused_retry_started", {
      target_skill_id: state.targetSkillId,
      support_level: latestAttempt.stage,
      variant_id: latestAttempt.variation.id,
      focused_criterion_id: latestEvaluation.improvementCriterionId,
    });
  };

  const chooseBridge = async (accepted: boolean) => {
    const now = new Date().toISOString();
    const bridge = {
      ...state.bridge,
      status: accepted ? "accepted" as const : "skipped" as const,
      offeredAt: state.bridge.offeredAt ?? now,
      respondedAt: now,
    };
    const next = { ...state, bridgeAccepted: accepted, bridge };
    saveState(next);
    trackLearningEvent("real_life_bridge_offered", {
      target_skill_id: state.targetSkillId,
      support_level: state.stage,
    });
    if (user) {
      setSyncState("syncing");
      const [journeyOk, bridgeOk] = await Promise.all([
        syncBridgeChoice(user.id, next, accepted),
        syncBridgeLifecycle(user.id, next, bridge),
      ]);
      const ok = journeyOk && bridgeOk;
      setSyncState(ok ? "synced" : "pending");
    }
  };

  const saveBridgeReflection = async () => {
    if (bridgeDidIt === null) return;
    const bridge = {
      ...state.bridge,
      status: "reflected" as const,
      didIt: bridgeDidIt,
      intensityBefore: bridgeBefore,
      intensityAfter: bridgeAfter,
      reflection: bridgeReflection.trim(),
      respondedAt: new Date().toISOString(),
    };
    const next = { ...state, bridgeAccepted: true, bridge };
    saveState(next);
    setStep("intro");
    if (user) {
      setSyncState("syncing");
      const ok = await syncBridgeLifecycle(user.id, next, bridge);
      setSyncState(ok ? "synced" : "pending");
    }
  };

  const setSurpriseOptIn = (accepted: boolean) => {
    saveState({ ...state, surpriseOptIn: accepted });
  };

  if (!ready) return null;
  const bridgeFollowUpDue = state.bridge?.status === "accepted" &&
    Boolean(state.bridge.respondedAt && state.bridge.respondedAt < openedAt);

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
            {bridgeFollowUpDue && <button className="secondary-button" type="button" onClick={() => setStep("bridge-reflection")}>Өмнөх жижиг алхмаа эргэн харах</button>}
            {isDaySeven && <button className="secondary-button connected-entry" type="button" onClick={() => setStep("connected")}>Day 7 Connected rehearsal</button>}
          </div>
          <button className="primary-button" type="button" onClick={beginRepair}>Pilot дасгал эхлэх</button>
        </article>
      )}

      {step === "bridge-reflection" && (
        <article className="pilot-card bridge-reflection-card">
          <p className="eyebrow">REAL-LIFE BRIDGE FOLLOW-UP</p>
          <h3>Жижиг алхам бодит нөхцөлд яаж өнгөрөв?</h3>
          <fieldset>
            <legend>Сонгосон жижиг алхмаа хийсэн үү?</legend>
            <button type="button" aria-pressed={bridgeDidIt === true} onClick={() => setBridgeDidIt(true)}>Тийм</button>
            <button type="button" aria-pressed={bridgeDidIt === false} onClick={() => setBridgeDidIt(false)}>Үгүй — энэ нь failure биш</button>
          </fieldset>
          <div className="fact-grid">
            <div className="intensity-row"><label htmlFor="bridge-before">Эхлэхийн өмнө</label><b>{bridgeBefore}/10</b><input id="bridge-before" type="range" min="0" max="10" value={bridgeBefore} onChange={(event) => setBridgeBefore(Number(event.target.value))} /></div>
            <div className="intensity-row"><label htmlFor="bridge-after">Дараа нь</label><b>{bridgeAfter}/10</b><input id="bridge-after" type="range" min="0" max="10" value={bridgeAfter} onChange={(event) => setBridgeAfter(Number(event.target.value))} /></div>
          </div>
          <label htmlFor="bridge-reflection">Бодсоноос юу өөр байсан бэ?</label>
          <textarea id="bridge-reflection" rows={3} value={bridgeReflection} onChange={(event) => setBridgeReflection(event.target.value)} />
          <div className="pilot-actions"><button type="button" className="text-button" onClick={() => setStep("intro")}>Одоо алгасах</button><button type="button" className="primary-button" disabled={bridgeDidIt === null} onClick={() => void saveBridgeReflection()}>Reflection хадгалах</button></div>
        </article>
      )}

      {step === "connected" && (
        <ConnectedRehearsal
          journeyId={state.journeyId}
          onClose={() => setStep("intro")}
          onComplete={(before, after) => onDaySevenComplete?.(before, after)}
        />
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

      {step === "future-context" && (
        <article className="pilot-card repair-card" aria-labelledby="future-context-title">
          <div className="pilot-step"><b>1</b><span>Future Rehearsal<small>Нэр болон таних мэдээлэл заавал оруулахгүй</small></span></div>
          <h3 id="future-context-title">Ойрын нөхцөлөө хоёр минутад бэлдэе</h3>
          <p>Бүх түүхийг бичих шаардлагагүй. Хэцүү санагдах нэг мөч болон бэлэн байлгах эхний өгүүлбэрээ сонгоно.</p>
          <div className="fact-grid">
            <label>Эвентийн төрөл
              <select value={futureContext.eventType ?? ""} onChange={(event) => setFutureContext({ ...futureContext, eventType: event.target.value })}>
                <option>Байгууллагын эвент</option>
                <option>Багийн хурал</option>
                <option>Жижиг бүлгийн яриа</option>
                <option>Нэг хүнтэй чухал уулзалт</option>
              </select>
            </label>
            <label>Оролцох хүмүүсийн үүрэг <span>(таслалаар салгана)</span>
              <input
                value={futureContext.peopleOrRoles?.join(", ") ?? ""}
                onChange={(event) => setFutureContext({ ...futureContext, peopleOrRoles: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })}
                placeholder="хамтрагч, багийн ахлах"
              />
            </label>
            <label>Хамгийн хэцүү санагдаж буй мөч
              <textarea rows={3} value={futureContext.fearedMoment ?? ""} onChange={(event) => setFutureContext({ ...futureContext, fearedMoment: event.target.value })} placeholder="Жишээ: Хоёр хүн зэрэг ярьсны дараа өөрийн санаагаа оруулах" />
            </label>
            <label>Бэлэн байлгах эхний өгүүлбэр
              <textarea rows={3} value={futureContext.intendedOpening ?? ""} onChange={(event) => setFutureContext({ ...futureContext, intendedOpening: event.target.value })} placeholder="Жишээ: Таны хэлсэнтэй холбоод нэг санаа нэмье…" />
            </label>
          </div>
          <div className="intensity-row">
            <label htmlFor="future-intensity">Хүлээгдэж буй түгшүүр</label><b>{futureContext.intensity ?? 4}/10</b>
            <input id="future-intensity" type="range" min="0" max="10" value={futureContext.intensity ?? 4} onChange={(event) => setFutureContext({ ...futureContext, intensity: Number(event.target.value) })} />
          </div>
          <p className="privacy-note">“Хадгалахгүй” сонговол энэ context refresh болон дараагийн нээлтэд хадгалагдахгүй.</p>
          <div className="pilot-actions">
            <button type="button" className="text-button" onClick={() => continueFromFuture("none")}>Хадгалахгүй үргэлжлүүлэх</button>
            <button type="button" className="secondary-button" onClick={() => continueFromFuture("device")}>Зөвхөн төхөөрөмжид хадгалах</button>
            <button type="button" className="primary-button" disabled={!user} title={!user ? "Cloud-д хадгалахын тулд нэвтэрнэ үү" : undefined} onClick={() => continueFromFuture("cloud")}>Cloud-д хадгалаад үргэлжлүүлэх</button>
          </div>
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
              <input
                type="checkbox"
                checked={state.surpriseOptIn}
                disabled={!lightSurpriseReady}
                onChange={(event) => setSurpriseOptIn(event.target.checked)}
              />
              {lightSurpriseReady
                ? "Хоёр Prompted хувилбар батлагдсан. Нэг хөнгөн гэнэтийн хувилбар туршихыг зөвшөөрөх"
                : "Light Surprise нээхийн өмнө хоёр өөр Prompted хувилбарт 2/3 шалгуур баталгаажуулна"}
            </label>
          )}
          {practiceContext && (
            <div className="context-brief" aria-label="Таны сонгосон нөхцөл">
              <span>{practiceContext.entryRoute === "past_repair" ? "ӨМНӨХ МӨЧ" : "ИРЭЭДҮЙН НӨХЦӨЛ"}</span>
              <b>{practiceContext.decisiveMoment ?? practiceContext.fearedMoment ?? practiceContext.eventType}</b>
              {(practiceContext.intendedOpening ?? practiceContext.desiredAction) && <p>{practiceContext.intendedOpening ?? practiceContext.desiredAction}</p>}
            </div>
          )}
          <div className="variation-meta">
            <span>{variation.environment}</span><span>{variation.character}</span><span>{variation.tone}</span>
          </div>
          {focusedRetry && retryEvaluation && (
            <div className="safe-recommendation" aria-live="polite">
              <b>Focused retry</b>
              <p>{retryEvaluation.retryPrompt}</p>
            </div>
          )}
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
            <button type="button" className="primary-button" disabled={!response.trim()} onClick={() => void finishAttempt(false)}>
              {focusedRetry ? "Focused retry-г дуусгах" : "Давталтыг дуусгах"}
            </button>
          </div>
        </article>
      )}

      {step === "media" && (
        <MediaPreview
          intensity={anxietyBefore}
          onBack={() => setStep(practiceContext?.entryRoute === "future_rehearsal" ? "future-context" : state.repair ? "repair" : "intro")}
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
          <h3>{safeFinished
            ? "Энд зогссон нь зөв сонголт."
            : latestEvaluation?.validAttempt
              ? "Нэг утгатай давталт дууслаа."
              : "Энэ оролдлогыг mastery-д тооцоогүй."}</h3>
          <p>{state.attempts.at(-1)?.decision === "pause"
            ? "Өнөөдөр энд амраад, дараа нь ижил эсвэл зөөлөн хувилбараас үргэлжлүүлнэ."
            : state.attempts.at(-1)?.decision === "consolidate"
              ? "Шинэ шатны чадвараа нэг танил хувилбараар тогтворжуулна."
              : state.stage === "guided"
                ? "Ижил дэмжлэгтэй, өөр жижиг нөхцөлөөр давтана."
                : `Дараагийн шат: ${stageLabels[state.stage]}.`}</p>
          {!safeFinished && (
            <div className="pilot-feedback">
              {latestEvaluation?.validAttempt ? (
                <>
                  <div className="feedback-line good"><b>✓ Сайн болсон</b><p>{latestEvaluation.strength}</p></div>
                  <div className="feedback-line improve">
                    <b>→ Нэг сайжруулалт</b>
                    <p>{latestEvaluation.improvement}</p>
                    <p><b>Жишээ хувилбар:</b> “{latestEvaluation.examplePhrase}”</p>
                  </div>
                </>
              ) : (
                <div className="feedback-line improve">
                  <b>Үнэлэхэд хангалтгүй байна</b>
                  <p>{latestEvaluation?.improvement}</p>
                </div>
              )}
              {latestAttempt?.retryOfAttemptId && (
                <p className="safe-recommendation">
                  {latestAttempt.criterionImproved
                    ? "Focused retry дээр сонгосон шалгуур сайжирлаа."
                    : "Сонгосон нэг шалгуурыг ижил scene дээр дахин тогтворжуулж болно."}
                </p>
              )}
            </div>
          )}
          <div className="result-stats"><span><b>{state.attempts.length}</b> нийт оролдлого</span><span><b>{anxietyBefore} → {anxietyAfter}</b> түгшүүр</span><span><b>{variation.changedDimensions.length}</b> өөрчилсөн хувьсагч</span></div>
          {latestEvaluation?.validAttempt && Math.max(anxietyBefore, anxietyAfter) < 8 && <div className="bridge-card">
            <p className="eyebrow">OPTIONAL REAL-LIFE BRIDGE</p>
            <h4>Дараагийн уулзалтаас өмнө эхний нэг өгүүлбэрээ notes-д бичих үү?</h4>
            <p>Хэнд ч илгээх шаардлагагүй. Алгассан ч streak болон ахиц буурахгүй.</p>
            <button type="button" className="secondary-button" onClick={() => void chooseBridge(true)}>Тийм, жижиг алхмыг сонгох</button>
            <button type="button" className="text-button" onClick={() => void chooseBridge(false)}>Одоохондоо алгасах</button>
          </div>}
          <div className="pilot-actions">
            {!safeFinished && latestEvaluation && (
              <button type="button" className="primary-button" onClick={startFocusedRetry}>
                Энэ нэг сайжруулалтыг дахин турших
              </button>
            )}
            <button type="button" className="secondary-button" onClick={repeat}>Өөр жижиг хувилбараар давтах</button>
            <button type="button" className="text-button" onClick={() => { onPracticeFinished?.(); setStep("intro"); }}>Дуусгах</button>
          </div>
        </article>
      )}
    </section>
  );
}
