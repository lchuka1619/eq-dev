"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  readTodayRouterState,
  recommendTodayRoute,
  writeTodayRouterState,
  type ReadinessCheck,
  type TodayRoute,
} from "@/lib/personal-practice/today-router";

type Props = {
  dailyMinutes: number;
  completedDays: number;
  streak: number;
  onDailyPractice: () => void;
  onStartRoute?: (route: TodayRoute) => void;
};

const defaultReadiness: ReadinessCheck = {
  accumulatedIntensity: 3,
  upcomingEvent: false,
  availableEnergy: 5,
};

const routeCopy: Record<TodayRoute, { title: string; reason: string; action: string }> = {
  past_repair: {
    title: "Нэг өмнөх мөчийг аюулгүй засварлах",
    reason: "Өмнөх ижил нөхцөлийн нөлөөг нэг жижиг мөчөөр салгаж үзнэ.",
    action: "Past Event Repair эхлэх",
  },
  future_rehearsal: {
    title: "Ойрын эвентэд хэлэх үгээ давтах",
    reason: "Ойрын тодорхой нөхцөлд ижил чадвараа хөнгөн хувилбараар бэлдэнэ.",
    action: "Future rehearsal эхлэх",
  },
  daily_skill_loop: {
    title: "Өнөөдрийн богино чадварын давталт",
    reason: "Танил бүтэцтэй нэг чадвараа тогтвортой давтана.",
    action: "Өнөөдрийн дасгалыг эхлүүлэх",
  },
};

export function TodayPracticeRouter({ dailyMinutes, completedDays, streak, onDailyPractice, onStartRoute }: Props) {
  const { user, setSyncState } = useAuth();
  const [readiness, setReadiness] = useState(defaultReadiness);
  const [selectedRoute, setSelectedRoute] = useState<TodayRoute | null>(null);
  const [configured, setConfigured] = useState(false);
  const hydratedUser = useRef<string | null>(null);
  const automatic = useMemo(() => recommendTodayRoute(readiness), [readiness]);
  const route = selectedRoute ?? automatic.route;
  const recommendation = selectedRoute ? { route, ...routeCopy[route] } : automatic;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = readTodayRouterState();
      if (saved) {
        setReadiness(saved.readiness);
        setSelectedRoute(saved.selectedRoute);
        setConfigured(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!user) {
      hydratedUser.current = null;
      return;
    }
    if (hydratedUser.current === user.id) return;
    hydratedUser.current = user.id;
    const client = getSupabaseBrowserClient();
    if (!client) return;
    void client
      .from("today_practice_routes")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) return;
        const cloudReadiness = data.readiness as ReadinessCheck;
        setReadiness(cloudReadiness);
        setSelectedRoute(data.selected_route as TodayRoute | null);
        setConfigured(true);
        writeTodayRouterState({
          readiness: cloudReadiness,
          selectedRoute: data.selected_route as TodayRoute | null,
        });
      });
  }, [user]);

  const persist = async (nextReadiness: ReadinessCheck, nextRoute: TodayRoute | null) => {
    writeTodayRouterState({ readiness: nextReadiness, selectedRoute: nextRoute });
    if (!user) return;
    const client = getSupabaseBrowserClient();
    if (!client) return;
    setSyncState("syncing");
    const recommended = recommendTodayRoute(nextReadiness);
    const { error } = await client.from("today_practice_routes").upsert({
      user_id: user.id,
      readiness: nextReadiness,
      recommended_route: recommended.route,
      selected_route: nextRoute,
    }, { onConflict: "user_id" });
    setSyncState(error ? "pending" : "synced");
  };

  const confirmReadiness = (nextRoute: TodayRoute | null = null) => {
    setSelectedRoute(nextRoute);
    setConfigured(true);
    void persist(readiness, nextRoute);
  };

  const override = (nextRoute: TodayRoute) => {
    setSelectedRoute(nextRoute);
    void persist(readiness, nextRoute);
  };

  const start = () => {
    if (onStartRoute) {
      onStartRoute(route);
      return;
    }
    if (route === "daily_skill_loop") {
      onDailyPractice();
      return;
    }
    window.dispatchEvent(new CustomEvent("eq:start-personal-practice", {
      detail: { route },
    }));
    document.getElementById("personal-practice-pilot")?.scrollIntoView({ behavior: "smooth" });
  };

  if (!configured) {
    return (
      <article className="featured-practice today-router-card readiness-card">
        <div>
          <p className="card-kicker">OPTIONAL READINESS CHECK · {dailyMinutes} МИНУТ</p>
          <h2>Өнөөдөр ямар дасгал илүү тохирох вэ?</h2>
          <p className="today-reason">Энэ нь онош биш. Зөвхөн өнөөдрийн дасгалын замыг сонгоход ашиглана.</p>
          <div className="readiness-grid">
            <label>Өмнөх ижил мөч одоо хэр хүчтэй санагдаж байна? <b>{readiness.accumulatedIntensity}/10</b>
              <input type="range" min="0" max="10" value={readiness.accumulatedIntensity} onChange={(event) => setReadiness({ ...readiness, accumulatedIntensity: Number(event.target.value) })} />
            </label>
            <label className="readiness-toggle">
              <input type="checkbox" checked={readiness.upcomingEvent} onChange={(event) => setReadiness({ ...readiness, upcomingEvent: event.target.checked })} />
              Ойрын хугацаанд тодорхой уулзалт эсвэл эвент байгаа
            </label>
            <label>Өнөөдрийн боломжит эрч хүч <b>{readiness.availableEnergy}/10</b>
              <input type="range" min="0" max="10" value={readiness.availableEnergy} onChange={(event) => setReadiness({ ...readiness, availableEnergy: Number(event.target.value) })} />
            </label>
          </div>
        </div>
        <div className="today-actions">
          <button className="primary-button light" type="button" onClick={() => confirmReadiness()}>Надад нэг дасгал санал болгох</button>
          <button className="today-change" type="button" onClick={() => confirmReadiness("daily_skill_loop")}>Алгасаад өдөр тутмын дасгал хийх</button>
        </div>
      </article>
    );
  }

  return (
    <article className="featured-practice today-router-card">
      <div>
        <p className="card-kicker">ӨНӨӨДРИЙН САНАЛ · {dailyMinutes} МИНУТ</p>
        <h2>{recommendation.title}</h2>
        <p className="today-reason">{recommendation.reason}</p>
        <div className="today-meta">
          <span>{dailyMinutes} минут</span><span>{completedDays}/7 өдөр</span><span>{streak} өдөр дараалан</span>
        </div>
        <details className="route-override">
          <summary>Өөр дасгал сонгох</summary>
          <div>
            {(Object.keys(routeCopy) as TodayRoute[]).map((item) => (
              <button type="button" key={item} aria-pressed={route === item} onClick={() => override(item)}>{routeCopy[item].title}</button>
            ))}
          </div>
        </details>
      </div>
      <div className="today-actions">
        <button className="primary-button light" type="button" onClick={start}>{recommendation.action}</button>
        <button className="today-change" type="button" onClick={() => setConfigured(false)}>Readiness-ээ шинэчлэх</button>
      </div>
    </article>
  );
}
