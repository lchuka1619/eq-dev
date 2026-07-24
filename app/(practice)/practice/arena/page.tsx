import type { Metadata } from "next";
import { PracticeExperience } from "@/components/app/practice-experience";
import { PracticeRouteShell } from "@/components/practice/practice-route-shell";

export const metadata: Metadata = { title: "Ярианы талбар · Өдөр бүрийн харилцаа" };

export default function ArenaPracticePage() {
  return <PracticeRouteShell label="Ярианы талбар"><PracticeExperience view="arena" /></PracticeRouteShell>;
}
