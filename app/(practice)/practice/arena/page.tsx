import type { Metadata } from "next";
import { PracticeExperience } from "@/components/app/practice-experience";

export const metadata: Metadata = { title: "Ярианы талбар · Өдөр бүрийн харилцаа" };

export default function ArenaPracticePage() {
  return <PracticeExperience view="arena" />;
}
