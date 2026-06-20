import type { Metadata } from "next";
import Patent from "@/views/Patent";

export const metadata: Metadata = {
  title: "Aczen Patents — Innovation in Financial Automation",
  description:
    "Explore Aczen's patent portfolio covering financial automation, compliance workflows and AI-driven accounting technologies.",
  keywords:
    "Aczen patents, fintech patents India, financial automation IP, Aczen innovation",
  alternates: { canonical: "/patent" },
  openGraph: {
    title: "Aczen Patents — Innovation in Financial Automation",
    description:
      "Explore Aczen's patent portfolio covering financial automation, compliance workflows and AI-driven accounting technologies.",
    url: "/patent",
  },
};

export default function Page() {
  return <Patent />;
}
