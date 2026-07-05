import type { Metadata } from "next";
import AgenticAI from "@/views/AgenticAI";

export const metadata: Metadata = {
  title: "Agentic AI for Finance — Prompt-driven Automation",
  description:
    "Aczen's Agentic AI runs your finance workflows end to end. Reconcile, file, chase payments and generate reports from a single prompt — while you stay in control.",
  alternates: { canonical: "/agentic-ai" },
  openGraph: {
    title: "Agentic AI for Finance — Prompt-driven Automation | Aczen",
    description:
      "Aczen's Agentic AI runs your finance workflows end to end — reconcile, file, chase and report from a single prompt.",
    url: "/agentic-ai",
  },
};

export default function Page() {
  return <AgenticAI />;
}
