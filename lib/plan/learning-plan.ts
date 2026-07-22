export type PrimaryGoal = "work" | "close-relationships" | "new-people";
export type PrimaryChallenge = "start" | "express" | "conflict";
export type DailyMinutes = 3 | 5 | 10;

export type UserPreferences = {
  primaryGoal: PrimaryGoal;
  primaryChallenge: PrimaryChallenge;
  dailyMinutes: DailyMinutes;
  onboardingCompletedAt: string;
};

export type PlanDay = {
  day: number;
  lessonIndex: number;
  title: string;
  reason: string;
  skill: string;
};

export type PlanCompletion = {
  day: number;
  date: string;
  skill: string;
  ratingBefore: number | null;
  ratingAfter: number | null;
};

export type LearningPlan = {
  id: string;
  status: "active" | "completed";
  startDate: string;
  currentDay: number;
  days: PlanDay[];
  completions: PlanCompletion[];
};

export const PREFERENCES_KEY = "hariltsaa-user-preferences-v1";
export const LEARNING_PLAN_KEY = "hariltsaa-learning-plan-v1";
export const ONBOARDING_SKIPPED_KEY = "hariltsaa-onboarding-skipped-v1";

const paths: Record<PrimaryChallenge, Array<Omit<PlanDay, "day">>> = {
  start: [
    { lessonIndex: 0, title: "Яриаг нэг өгүүлбэрээр эхлүүлэх", reason: "Эхний үгийг төгс болгох дарамтыг багасгана.", skill: "Яриа эхлүүлэх" },
    { lessonIndex: 3, title: "Нээлттэй нэг асуулт тавих", reason: "Яриаг ганцаараа авч явах шаардлагагүй болгоно.", skill: "Асуулт тавих" },
    { lessonIndex: 1, title: "30 секундэд саналаа хэлэх", reason: "Богино, ойлгомжтой оролцоог давтана.", skill: "Тодорхой илэрхийлэх" },
    { lessonIndex: 0, title: "Сонссоноо буцааж хэлэх", reason: "Хариу зохиохын оронд холбоос үүсгэнэ.", skill: "Идэвхтэй сонсох" },
    { lessonIndex: 2, title: "Эелдгээр хил тавих", reason: "Тайван бөгөөд товч хариултыг дадуулна.", skill: "Хил хязгаар" },
    { lessonIndex: 3, title: "Гацсан үед дахин эхлэх", reason: "Алдааны дараа яриагаа сэргээх чадварыг бататгана.", skill: "Recovery" },
    { lessonIndex: 1, title: "Өөрийн үгээр чөлөөтэй хариулах", reason: "Өмнөх зургаан өдрийн чадварыг нэгтгэнэ.", skill: "Яриа эхлүүлэх" },
  ],
  express: [
    { lessonIndex: 1, title: "Саналаа 30 секундэд тодорхой хэлэх", reason: "Гол санаагаа эхэнд нь тавьж сурна.", skill: "Тодорхой илэрхийлэх" },
    { lessonIndex: 4, title: "Баримт ба мэдрэмжийг салгах", reason: "Шүүлтгүйгээр өөрийн байр сууриа хэлнэ.", skill: "Тайван feedback" },
    { lessonIndex: 3, title: "Нэг шалтгаан нэмэх", reason: "Хүсэлтийнхээ учрыг товч ойлгуулна.", skill: "Тодорхой илэрхийлэх" },
    { lessonIndex: 0, title: "Нөгөө хүний санааг баталгаажуулах", reason: "Сонссон гэдгээ харуулаад саналаа нэмнэ.", skill: "Идэвхтэй сонсох" },
    { lessonIndex: 2, title: "Тодорхой хүсэлт тавих", reason: "Дараагийн алхмыг ойлгомжтой болгоно.", skill: "Хил хязгаар" },
    { lessonIndex: 1, title: "Ижил санааг илүү товч хэлэх", reason: "Дахин оролдолтоор ойлгомжийг нэмнэ.", skill: "Тодорхой илэрхийлэх" },
    { lessonIndex: 4, title: "Нэг минутын бүтэн хариу", reason: "Долоо хоногийн чадваруудаа нэгтгэнэ.", skill: "Тодорхой илэрхийлэх" },
  ],
  conflict: [
    { lessonIndex: 4, title: "Баримтаас тайван эхлэх", reason: "Буруутгалгүйгээр асуудлыг нэрлэнэ.", skill: "Зөрчил зохицуулах" },
    { lessonIndex: 0, title: "Мэдрэмжийг буцааж хэлэх", reason: "Хамгаалах байр суурь руу орохоос сэргийлнэ.", skill: "Идэвхтэй сонсох" },
    { lessonIndex: 2, title: "Эелдэг хил хязгаар тавих", reason: "Боломжгүй зүйлээ товч хэлнэ.", skill: "Хил хязгаар" },
    { lessonIndex: 3, title: "Алдаагаа тайлбаргүй хүлээх", reason: "Хариуцлага ба дараагийн алхмыг салгана.", skill: "Recovery" },
    { lessonIndex: 1, title: "Нэг тодорхой хүсэлт тавих", reason: "Маргааныг бодит үйлдэл рүү шилжүүлнэ.", skill: "Тодорхой хүсэлт" },
    { lessonIndex: 4, title: "Хүйтэн хариуны дараа үргэлжлүүлэх", reason: "Таагүй мөчийг сүйрэл гэж тайлбарлахгүй.", skill: "Recovery" },
    { lessonIndex: 2, title: "Тайван бүтэн яриа давтах", reason: "Долоо хоногийн чадваруудаа нэгтгэнэ.", skill: "Зөрчил зохицуулах" },
  ],
};

export function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function createLearningPlan(preferences: UserPreferences): LearningPlan {
  return {
    id: crypto.randomUUID(),
    status: "active",
    startDate: todayKey(),
    currentDay: 1,
    days: paths[preferences.primaryChallenge].map((item, index) => ({ ...item, day: index + 1 })),
    completions: [],
  };
}

export function completeLearningPlanDay(plan: LearningPlan, ratingBefore: number | null, ratingAfter: number | null) {
  const date = todayKey();
  if (plan.completions.some((item) => item.date === date)) return plan;
  const current = plan.days[Math.min(plan.currentDay - 1, 6)];
  const completions = [...plan.completions, { day: plan.currentDay, date, skill: current.skill, ratingBefore, ratingAfter }];
  const complete = completions.length >= 7;
  return { ...plan, completions, currentDay: complete ? 7 : Math.min(7, plan.currentDay + 1), status: complete ? "completed" as const : "active" as const };
}

export function persistPlan(preferences: UserPreferences | null, plan: LearningPlan | null) {
  try {
    if (preferences) localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    if (plan) localStorage.setItem(LEARNING_PLAN_KEY, JSON.stringify(plan));
  } catch { /* local-first state remains in memory */ }
}
