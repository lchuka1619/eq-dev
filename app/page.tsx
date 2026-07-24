import type { Metadata } from "next";
import { PublicLanding } from "@/components/app/public-landing";

export const metadata: Metadata = {
  title: "Өдөр бүрийн харилцаа",
  description: "Өдөр бүр 3–10 минутын аюулгүй харилцааны дасгал.",
};

export default function HomePage() {
  return <PublicLanding />;
}
