import type { Metadata } from "next";
import { PracticeExperience } from "@/components/app/practice-experience";

export const metadata: Metadata = { title: "Дүрд тоглох · Өдөр бүрийн харилцаа" };

export default function RoleplayPracticePage() {
  return <PracticeExperience view="roleplay" />;
}
