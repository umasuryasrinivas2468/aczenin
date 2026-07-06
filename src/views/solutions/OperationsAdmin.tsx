"use client";

import {
  Settings,
  Workflow,
  CheckCircle2,
  Bell,
  FileText,
  ShieldCheck,
  LayoutDashboard,
} from "lucide-react";
import SolutionTemplate, { type SolutionContent } from "@/views/SolutionTemplate";

const content: SolutionContent = {
  path: "/solutions/operations-admin",
  seo: {
    title: "Aczen for Operations & Admin — Automate the Busywork",
    description:
      "Automate approvals, vendor payments and recurring tasks. Give operations and admin teams a single dashboard to run the business day to day.",
    keywords:
      "operations software India, admin automation, approval workflows, vendor payments, back-office automation, Aczen for operations",
  },
  eyebrow: "Operations & Admin",
  icon: Settings,
  title: "Automate the",
  titleHighlight: "day-to-day busywork.",
  subtitle:
    "Approvals, vendor payments, recurring tasks and reporting — automate the back office so your team can focus on running the business.",
  stats: [
    { value: "80%", label: "less manual work" },
    { value: "One", label: "control panel" },
    { value: "Auto", label: "approvals" },
    { value: "Always", label: "audit-ready" },
  ],
  features: [
    {
      icon: Workflow,
      title: "Approval workflows",
      description:
        "Route purchases, payments and expenses through maker-checker approvals.",
    },
    {
      icon: FileText,
      title: "Vendor payments",
      description:
        "Batch-pay vendors via NEFT, RTGS and IMPS with a full record on every payout.",
    },
    {
      icon: LayoutDashboard,
      title: "Single dashboard",
      description:
        "See tasks, approvals, payments and cash in one operations control panel.",
    },
    {
      icon: Bell,
      title: "Smart reminders",
      description:
        "Automated nudges for pending approvals, due bills and renewals.",
    },
    {
      icon: ShieldCheck,
      title: "Roles & permissions",
      description:
        "Give each team member exactly the access they need — nothing more.",
    },
    {
      icon: CheckCircle2,
      title: "Recurring tasks",
      description:
        "Automate repeating admin tasks so nothing slips through the cracks.",
    },
  ],
  benefitsHeading: "Run operations without the chaos",
  benefitsSubtitle:
    "Replace email chains and spreadsheets with automated, auditable workflows.",
  benefits: [
    "Configurable approval chains for any process",
    "Batch vendor payments with one approval",
    "A single dashboard for the whole back office",
    "Automated reminders so nothing is missed",
    "Complete audit trail on every action",
  ],
  ctaTitle: "Give your ops team hours back",
  ctaSubtitle:
    "See how Aczen automates approvals, payments and the daily busywork.",
};

const OperationsAdmin = () => <SolutionTemplate content={content} />;
export default OperationsAdmin;
