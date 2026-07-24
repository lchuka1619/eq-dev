import type { Metadata } from "next";
import { PracticeExperience } from "@/components/app/practice-experience";

export const metadata: Metadata = { title: "Ахиц · Өдөр бүрийн харилцаа" };

export default function ProgressPage() {
  return <PracticeExperience view="progress" />;
}
