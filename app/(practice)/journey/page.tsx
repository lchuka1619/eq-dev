import type { Metadata } from "next";
import { PracticeExperience } from "@/components/app/practice-experience";

export const metadata: Metadata = { title: "Замнал · Өдөр бүрийн харилцаа" };

export default function JourneyPage() {
  return <PracticeExperience view="journey" />;
}
