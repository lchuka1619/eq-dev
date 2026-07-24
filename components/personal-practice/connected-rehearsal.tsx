"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import {
  connectedMoments,
  connectedTimeRemaining,
  createConnectedRehearsal,
  readConnectedRehearsal,
  writeConnectedRehearsal,
  type ConnectedRehearsalState,
} from "@/lib/personal-practice/connected-rehearsal";
import { hydrateConnectedRehearsal, syncConnectedRehearsal } from "@/lib/personal-practice/cloud-practice";

type Props = {
  journeyId: string;
  onClose: () => void;
  onComplete: (before: number, after: number) => void;
};

export function ConnectedRehearsal({ journeyId, onClose, onComplete }: Props) {
  const { user, setSyncState } = useAuth();
  const [state, setState] = useState<ConnectedRehearsalState>(() => createConnectedRehearsal(journeyId));
  const [response, setResponse] = useState("");
  const [ready, setReady] = useState(false);
  const hydratedUser = useRef<string | null>(null);
  const moment = connectedMoments[Math.min(state.currentMoment, connectedMoments.length - 1)];
  const remaining = connectedTimeRemaining(state.elapsedSeconds);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setState(readConnectedRehearsal(journeyId));
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [journeyId]);

  useEffect(() => {
    if (!ready || !user || hydratedUser.current === user.id) return;
    hydratedUser.current = user.id;
    void hydrateConnectedRehearsal(user.id, state).then((next) => {
      setState(next);
      writeConnectedRehearsal(next);
    });
  }, [ready, state, user]);

  useEffect(() => {
    if (state.status !== "active") return;
    const timer = window.setInterval(() => {
      setState((current) => {
        const next = { ...current, elapsedSeconds: Math.min(720, current.elapsedSeconds + 1) };
        writeConnectedRehearsal(next);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [state.status]);

  const persist = (next: ConnectedRehearsalState, cloud = true) => {
    setState(next);
    writeConnectedRehearsal(next);
    if (cloud && user) {
      setSyncState("syncing");
      void syncConnectedRehearsal(user.id, next).then((ok) => setSyncState(ok ? "synced" : "pending"));
    }
  };

  const start = () => persist({
    ...state,
    status: "active",
    startedAt: state.startedAt ?? new Date().toISOString(),
  });

  const togglePause = () => {
    const pausing = state.status === "active";
    persist({
      ...state,
      status: pausing ? "paused" : "active",
      pauseCount: pausing ? state.pauseCount + 1 : state.pauseCount,
    });
  };

  const useRecovery = () => {
    setResponse(moment.recovery ?? "Би нэг мөч бодоод, гол санаагаа товч хэлье…");
    persist({ ...state, usedRecovery: true }, false);
  };

  const nextMoment = () => {
    if (!response.trim()) return;
    const completedMomentIds = Array.from(new Set([...state.completedMomentIds, moment.id]));
    const localResponses = { ...state.localResponses, [moment.id]: response.trim() };
    setResponse("");
    if (state.currentMoment >= connectedMoments.length - 1) {
      const next = {
        ...state,
        status: "completed" as const,
        completedMomentIds,
        localResponses,
        completedAt: new Date().toISOString(),
      };
      persist(next);
      return;
    }
    persist({
      ...state,
      currentMoment: state.currentMoment + 1,
      completedMomentIds,
      localResponses,
    });
  };

  const safeFinish = () => persist({
    ...state,
    status: "safe-finish",
    completedAt: new Date().toISOString(),
  });

  if (!ready) return null;
  if (state.status === "idle") {
    return (
      <article className="pilot-card connected-intro">
        <p className="eyebrow">DAY 7 · CONNECTED REHEARSAL</p>
        <h3>7 шийдвэрийн мөчийг нэг урсгалаар давтъя</h3>
        <p>8–10 минутын cap, нэг recovery branch, хүссэн үедээ pause эсвэл safe finish.</p>
        <div className="intensity-row">
          <label htmlFor="connected-before">Эхлэхийн өмнөх түгшүүр</label><b>{state.intensityBefore}/10</b>
          <input id="connected-before" type="range" min="0" max="10" value={state.intensityBefore} onChange={(event) => persist({ ...state, intensityBefore: Number(event.target.value), intensityAfter: Number(event.target.value) }, false)} />
        </div>
        <div className="pilot-actions"><button className="text-button" type="button" onClick={onClose}>Буцах</button><button className="primary-button" type="button" onClick={start}>Connected rehearsal эхлэх</button></div>
      </article>
    );
  }

  if (state.status === "completed" || state.status === "safe-finish") {
    return (
      <article className="pilot-card connected-complete">
        <span className="complete-mark">{state.status === "completed" ? "✓" : "Ⅱ"}</span>
        <h3>{state.status === "completed" ? "Connected rehearsal дууслаа." : "Энд аюулгүй дуусгалаа."}</h3>
        <p>{state.completedMomentIds.length}/7 шийдвэрийн мөч · {Math.ceil(state.elapsedSeconds / 60)} минут · Recovery {state.usedRecovery ? "ашигласан" : "шаардлагагүй"}</p>
        <div className="intensity-row">
          <label htmlFor="connected-after">Дараах түгшүүр</label><b>{state.intensityAfter}/10</b>
          <input id="connected-after" type="range" min="0" max="10" value={state.intensityAfter} onChange={(event) => persist({ ...state, intensityAfter: Number(event.target.value) })} />
        </div>
        <button className="primary-button" type="button" onClick={() => {
          if (state.status === "completed") onComplete(state.intensityBefore, state.intensityAfter);
          onClose();
        }}>Дуусгах</button>
      </article>
    );
  }

  return (
    <article className="pilot-card connected-session" aria-live="polite">
      <div className="connected-head">
        <div><p className="eyebrow">CONNECTED REHEARSAL</p><b>{state.currentMoment + 1}/7 · {String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}</b></div>
        <div><button type="button" onClick={togglePause}>{state.status === "paused" ? "▶ Үргэлжлүүлэх" : "Ⅱ Pause"}</button><button type="button" onClick={safeFinish}>Safe finish</button></div>
      </div>
      {state.status === "paused" ? (
        <div className="connected-paused"><h3>Түр зогслоо</h3><p>Амьсгалаа ажиглаад, бэлэн үедээ үргэлжлүүлээрэй.</p><button className="primary-button" type="button" onClick={togglePause}>Үргэлжлүүлэх</button></div>
      ) : (
        <>
          {remaining === 0 && <p className="safe-recommendation">10 минутын cap хүрлээ. Энд safe finish хийх эсвэл энэ мөчөөр дуусгаж болно.</p>}
          <div className="connected-progress">{connectedMoments.map((item, index) => <i key={item.id} className={index <= state.currentMoment ? "active" : ""} />)}</div>
          <p className="small-label">{moment.title}</p>
          <blockquote>{moment.characterLine}</blockquote>
          <h3>{moment.prompt}</h3>
          {moment.recovery && <button className="hint-toggle" type="button" onClick={useRecovery}>◇ Recovery phrase ашиглах</button>}
          <label htmlFor="connected-response">Таны хариулт</label>
          <textarea id="connected-response" rows={3} value={response} onChange={(event) => setResponse(event.target.value)} />
          <div className="pilot-actions"><button className="text-button" type="button" onClick={safeFinish}>Энд аюулгүй дуусгах</button><button className="primary-button" type="button" disabled={!response.trim()} onClick={nextMoment}>{state.currentMoment === 6 ? "Rehearsal дуусгах" : "Дараагийн мөч"}</button></div>
        </>
      )}
    </article>
  );
}
