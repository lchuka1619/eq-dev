import type { Metadata } from "next";
import { PracticeExperience } from "@/components/app/practice-experience";
import { PracticeRouteShell } from "@/components/practice/practice-route-shell";

export const metadata: Metadata = { title: "Өдөр тутмын дасгал · Өдөр бүрийн харилцаа" };

export default function DailyPracticePage() {
  return <PracticeRouteShell label="Өдөр тутмын чадвар"><PracticeExperience view="daily" /></PracticeRouteShell>;
}
