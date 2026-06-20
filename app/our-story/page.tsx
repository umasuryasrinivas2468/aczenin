import type { Metadata } from "next";
import OurStory from "@/views/OurStory";

export const metadata: Metadata = {
  title: "Our Story — The Journey of Aczen Technologies",
  description:
    "Founded in April 2024, Aczen is building India's unified financial OS. Follow our milestones — Web3 partnerships, Aczen Connect, Cashfree integration, and more.",
  keywords: "Aczen story, Aczen history, Aczen Technologies journey, fintech startup India",
  alternates: { canonical: "/our-story" },
  openGraph: {
    title: "Our Story — The Journey of Aczen Technologies",
    description:
      "Founded in April 2024, Aczen is building India's unified financial OS. Follow our milestones — Web3 partnerships, Aczen Connect, Cashfree integration, and more.",
    url: "/our-story",
  },
};

export default function Page() {
  return <OurStory />;
}
