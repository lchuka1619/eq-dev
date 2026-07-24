import type { Metadata } from "next";
import { PracticeExperience } from "@/components/app/practice-experience";
import { PracticeRouteShell } from "@/components/practice/practice-route-shell";

export const metadata: Metadata = { title: "Personal Practice · Өдөр бүрийн харилцаа" };

export default function PersonalPracticePage() {
  return <PracticeRouteShell label="Personal Practice"><PracticeExperience view="personal" /></PracticeRouteShell>;
}
