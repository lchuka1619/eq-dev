import type { Metadata } from "next";
import { PracticeExperience } from "@/components/app/practice-experience";

export const metadata: Metadata = { title: "AI дадлага · Өдөр бүрийн харилцаа" };

export default function VoicePracticePage() {
  return <PracticeExperience view="voice" />;
}
