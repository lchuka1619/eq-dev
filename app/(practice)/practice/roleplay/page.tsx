import type { Metadata } from "next";
import { PracticeExperience } from "@/components/app/practice-experience";
import { PracticeRouteShell } from "@/components/practice/practice-route-shell";

export const metadata: Metadata = { title: "Дүрд тоглох · Өдөр бүрийн харилцаа" };

export default function RoleplayPracticePage() {
  return <PracticeRouteShell label="Дүрд тоглох"><PracticeExperience view="roleplay" /></PracticeRouteShell>;
}
