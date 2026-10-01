import type { Metadata } from "next";
import { SelfCheckIn } from "@/components/SelfCheckIn";

export const metadata: Metadata = {
  title: "Check In — Pickleball Queue",
  description: "Add yourself to the pickleball queue.",
};

export default function CheckInPage() {
  return <SelfCheckIn />;
}
