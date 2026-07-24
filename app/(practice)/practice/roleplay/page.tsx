import type { Metadata } from "next";
import { PracticeRouteShell } from "@/components/practice/practice-route-shell";
import { RoleplayPracticeExperience } from "@/components/practice/roleplay-practice-experience";

export const metadata: Metadata = { title: "Дүрд тоглох · Өдөр бүрийн харилцаа" };

export default function RoleplayPracticePage() {
  return <PracticeRouteShell label="Дүрд тоглох"><RoleplayPracticeExperience /></PracticeRouteShell>;
}
