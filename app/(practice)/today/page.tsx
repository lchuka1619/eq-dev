import type { Metadata } from "next";
import { PracticeExperience } from "@/components/app/practice-experience";

export const metadata: Metadata = { title: "Өнөөдөр · Өдөр бүрийн харилцаа" };

export default function TodayPage() {
  return <PracticeExperience view="today" />;
}
