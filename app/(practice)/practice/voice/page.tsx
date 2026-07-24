import type { Metadata } from "next";
import { PracticeExperience } from "@/components/app/practice-experience";
import { PracticeRouteShell } from "@/components/practice/practice-route-shell";

export const metadata: Metadata = { title: "AI дадлага · Өдөр бүрийн харилцаа" };

export default function VoicePracticePage() {
  return <PracticeRouteShell label="AI дадлага"><PracticeExperience view="voice" /></PracticeRouteShell>;
}
