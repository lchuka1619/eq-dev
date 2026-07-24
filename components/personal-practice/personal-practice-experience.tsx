"use client";

import { PersonalPracticePilot } from "@/components/personal-practice/personal-practice-pilot";
import { useLearningPlan } from "@/lib/plan/cloud-plan";
import { isPastEventPilotEnabled } from "@/lib/personal-practice/today-router";

export function PersonalPracticeExperience() {
  const { plan, completeToday } = useLearningPlan();

  if (!isPastEventPilotEnabled()) {
    return (
      <section className="personal-pilot section-shell" aria-labelledby="personal-practice-unavailable">
        <article className="pilot-card">
          <p className="small-label">PERSONAL PRACTICE</p>
          <h1 id="personal-practice-unavailable">Энэ дасгал одоогоор түр хаалттай байна</h1>
          <p>Өдөр тутмын чадварын дасгалаас үргэлжлүүлэн ажиллаж болно.</p>
        </article>
      </section>
    );
  }

  return (
    <div className="practice-experience practice-view-personal">
      <PersonalPracticePilot
        isDaySeven={plan?.currentDay === 7}
        onDaySevenComplete={(before, after) => completeToday(before, after)}
      />
    </div>
  );
}
