"use client";

import {
  Wallet,
  LineChart,
  FileText,
  Banknote,
  ShieldCheck,
  Repeat,
  Calculator,
} from "lucide-react";
import SolutionTemplate, { type SolutionContent } from "@/views/SolutionTemplate";

const content: SolutionContent = {
  path: "/solutions/finance",
  seo: {
    title: "Aczen for Finance Teams — Close, Report & Control",
    description:
      "Give finance teams a single platform for accounting, cash flow, payments and reporting. Close faster, control spend and stay audit-ready.",
    keywords:
      "finance software India, finance team platform, financial reporting, month-end close, cash management, Aczen for finance",
  },
  eyebrow: "Finance",
  icon: Wallet,
  title: "Run finance on",
  titleHighlight: "one connected platform.",
  subtitle:
    "From the daily ledger to the month-end close, give your finance team the tools to move faster, control spend and stay audit-ready.",
  stats: [
    { value: "5x", label: "faster close" },
    { value: "Real-time", label: "reporting" },
    { value: "100%", label: "audit trail" },
    { value: "Unified", label: "ledger" },
  ],
  features: [
    {
      icon: Calculator,
      title: "Automated accounting",
      description:
        "Transactions flow straight into your ledgers, categorised and reconciled.",
    },
    {
      icon: LineChart,
      title: "Real-time reporting",
      description:
        "P&L, balance sheet and cash flow that update live — no waiting for month-end.",
    },
    {
      icon: Banknote,
      title: "Cash control",
      description:
        "Consolidated balances, forecasting and alerts across every bank account.",
    },
    {
      icon: FileText,
      title: "Faster close",
      description:
        "Automated reconciliation and checklists shrink your close from weeks to days.",
    },
    {
      icon: ShieldCheck,
      title: "Controls & audit",
      description:
        "Maker-checker workflows and a full audit trail on every entry and payment.",
    },
    {
      icon: Repeat,
      title: "Recurring workflows",
      description:
        "Automate recurring invoices, bills, payroll and journal entries end to end.",
    },
  ],
  benefitsHeading: "A finance stack that scales with you",
  benefitsSubtitle:
    "Replace spreadsheets and disconnected tools with one source of truth.",
  benefits: [
    "One ledger connecting invoicing, payments and banking",
    "Live dashboards for leadership and investors",
    "Built-in GST, TDS and compliance",
    "Role-based access and approval controls",
    "Export-ready reports for auditors and boards",
  ],
  ctaTitle: "Give your finance team superpowers",
  ctaSubtitle:
    "See how Aczen unifies accounting, payments and reporting in one platform.",
};

const Finance = () => <SolutionTemplate content={content} />;
export default Finance;
