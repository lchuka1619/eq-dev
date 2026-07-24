import type { Metadata } from "next";
import { ProfilePage } from "@/components/app/profile-page";

export const metadata: Metadata = { title: "Профайл · Өдөр бүрийн харилцаа" };

export default function ProfileRoute() {
  return <ProfilePage />;
}
