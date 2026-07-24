import type { Metadata } from "next";
import { PracticeExperience } from "@/components/app/practice-experience";

export const metadata: Metadata = { title: "Өдөр тутмын дасгал · Өдөр бүрийн харилцаа" };

export default function DailyPracticePage() {
  return <PracticeExperience view="daily" />;
}
