"use client";

import {
  Sparkles,
  Bot,
  Zap,
  MessageSquare,
  ShieldCheck,
  Workflow,
  Search,
} from "lucide-react";
import SolutionTemplate, { type SolutionContent } from "@/views/SolutionTemplate";

const content: SolutionContent = {
  path: "/agentic-ai",
  seo: {
    title: "Agentic AI for Finance — Prompt-driven Automation | Aczen",
    description:
      "Aczen's Agentic AI runs your finance workflows end to end. Reconcile, file, chase payments and generate reports from a single prompt — while you stay in control.",
    keywords:
      "agentic AI finance, AI accounting automation, finance AI agent, prompt-driven finance, Aczen AI, autonomous finance workflows",
  },
  eyebrow: "Agentic AI",
  icon: Sparkles,
  title: "Your finance team's",
  titleHighlight: "autonomous copilot.",
  subtitle:
    "Prompt-driven execution that runs your finance workflows end to end — reconciling, filing and reporting on its own, while you stay firmly in control.",
  stats: [
    { value: "24/7", label: "always working" },
    { value: "Minutes", label: "not days" },
    { value: "Human", label: "in the loop" },
    { value: "Auditable", label: "every action" },
  ],
  features: [
    {
      icon: MessageSquare,
      title: "Prompt to action",
      description:
        "Type “reconcile September invoices” and the agent plans and executes the whole task.",
    },
    {
      icon: Workflow,
      title: "End-to-end workflows",
      description:
        "Chain reconciliation, filing, payment chasing and reporting into one autonomous run.",
    },
    {
      icon: Search,
      title: "Context-aware",
      description:
        "The agent reads your ledgers, invoices and payments to make the right decisions.",
    },
    {
      icon: ShieldCheck,
      title: "Human in the loop",
      description:
        "Approve high-impact steps before they happen — you keep control at every stage.",
    },
    {
      icon: Zap,
      title: "Instant results",
      description:
        "Work that took analysts days completes in minutes, with a clear summary of actions.",
    },
    {
      icon: Bot,
      title: "Fully auditable",
      description:
        "Every action the agent takes is logged with a reason, ready for review and audit.",
    },
  ],
  benefitsHeading: "Automation you can actually trust",
  benefitsSubtitle:
    "The speed of AI with the guardrails finance teams need to sleep at night.",
  benefits: [
    "Natural-language prompts — no scripts or setup",
    "Approvals and limits keep humans in control",
    "Every decision is explained and logged",
    "Works across invoicing, GST, payments and reports",
    "Learns your business the more you use it",
  ],
  ctaTitle: "Put your finance ops on autopilot",
  ctaSubtitle:
    "See Agentic AI run a real workflow end to end — from prompt to completed task.",
};

const AgenticAI = () => <SolutionTemplate content={content} />;
export default AgenticAI;
