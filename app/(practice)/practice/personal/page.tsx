import type { Metadata } from "next";
import { PracticeExperience } from "@/components/app/practice-experience";

export const metadata: Metadata = { title: "Personal Practice · Өдөр бүрийн харилцаа" };

export default function PersonalPracticePage() {
  return <PracticeExperience view="personal" />;
}
