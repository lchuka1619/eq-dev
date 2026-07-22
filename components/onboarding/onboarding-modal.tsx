"use client";

import { useState } from "react";
import type { DailyMinutes, PrimaryChallenge, PrimaryGoal, UserPreferences } from "@/lib/plan/learning-plan";

type Props = {
  open: boolean;
  onComplete: (preferences: UserPreferences) => void;
  onSkip: () => void;
};

const steps = [
  { title: "Ямар нөхцөлд сайжрах вэ?", options: [["work", "Ажил дээр харилцах"], ["close-relationships", "Гэр бүл, ойрын харилцаа"], ["new-people", "Танихгүй хүнтэй ярилцах"]] },
  { title: "Таны гол хүндрэл юу вэ?", options: [["start", "Яриа эхлүүлэх"], ["express", "Өөрийгөө ойлгомжтой илэрхийлэх"], ["conflict", "Зөрчил, бухимдлыг зохицуулах"]] },
  { title: "Өдөрт хэдэн минут зориулах вэ?", options: [["3", "3 минут"], ["5", "5 минут"], ["10", "10 минут"]] },
] as const;

export function OnboardingModal({ open, onComplete, onSkip }: Props) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<PrimaryGoal>("work");
  const [challenge, setChallenge] = useState<PrimaryChallenge>("start");
  const [minutes, setMinutes] = useState<DailyMinutes>(3);
  if (!open) return null;
  const selected = step === 0 ? goal : step === 1 ? challenge : String(minutes);
  const choose = (value: string) => {
    if (step === 0) setGoal(value as PrimaryGoal);
    else if (step === 1) setChallenge(value as PrimaryChallenge);
    else setMinutes(Number(value) as DailyMinutes);
  };
  const next = () => {
    if (step < 2) setStep(step + 1);
    else onComplete({ primaryGoal: goal, primaryChallenge: challenge, dailyMinutes: minutes, onboardingCompletedAt: new Date().toISOString() });
  };

  return (
    <div className="dialog-backdrop onboarding-backdrop" role="presentation">
      <section className="onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <div className="onboarding-progress" aria-label={`Алхам ${step + 1}/3`}>{[0, 1, 2].map((item) => <i key={item} className={item <= step ? "active" : ""} />)}</div>
        <p className="small-label">ТАНЫ 7 ӨДРИЙН ЗАМ</p>
        <h2 id="onboarding-title">{steps[step].title}</h2>
        <div className="onboarding-options">
          {steps[step].options.map(([value, label]) => (
            <button type="button" key={value} className={selected === value ? "selected" : ""} onClick={() => choose(value)}>{label}</button>
          ))}
        </div>
        <div className="onboarding-actions">
          <button type="button" className="text-button" onClick={onSkip}>Одоо алгасах</button>
          <button type="button" className="primary-button" onClick={next}>{step === 2 ? "7 өдрийн зам үүсгэх" : "Үргэлжлүүлэх"}</button>
        </div>
        <small>Нэвтрэх шаардлагагүй. Ахиц эхлээд энэ төхөөрөмжид хадгалагдана.</small>
      </section>
    </div>
  );
}
