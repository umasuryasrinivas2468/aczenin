"use client";

import {
  ReceiptText,
  CreditCard,
  Camera,
  ShieldCheck,
  CheckCircle2,
  Wallet,
  PieChart,
} from "lucide-react";
import SolutionTemplate, { type SolutionContent } from "@/views/SolutionTemplate";

const content: SolutionContent = {
  path: "/expense-management",
  seo: {
    title: "Expense Management Software — Track & Control Spend | Aczen",
    description:
      "Capture receipts, issue corporate cards, enforce spend policies and reimburse employees fast. Real-time visibility into every rupee your business spends.",
    keywords:
      "expense management software India, corporate cards, receipt capture, spend management, employee reimbursement, Aczen expenses",
  },
  eyebrow: "Expense Management",
  icon: ReceiptText,
  title: "Track & control",
  titleHighlight: "every rupee of spend.",
  subtitle:
    "Capture receipts, issue smart cards, enforce policies and reimburse your team — all in one place, with real-time visibility across the business.",
  stats: [
    { value: "70%", label: "less time on reports" },
    { value: "Real-time", label: "spend visibility" },
    { value: "0", label: "reconciliation errors" },
    { value: "Instant", label: "policy checks" },
  ],
  features: [
    {
      icon: CreditCard,
      title: "Corporate cards",
      description:
        "Issue virtual and physical cards with per-card limits, merchant controls and instant freeze.",
    },
    {
      icon: Camera,
      title: "Receipt capture",
      description:
        "Snap a photo and Aczen auto-extracts the amount, GST and vendor — no manual entry.",
    },
    {
      icon: ShieldCheck,
      title: "Policy controls",
      description:
        "Set spend policies once and let Aczen flag out-of-policy expenses automatically.",
    },
    {
      icon: CheckCircle2,
      title: "Approvals",
      description:
        "Maker-checker approval workflows route every expense to the right approver.",
    },
    {
      icon: Wallet,
      title: "Reimbursements",
      description:
        "Approve and pay employee reimbursements in a single click, straight to their account.",
    },
    {
      icon: PieChart,
      title: "Spend analytics",
      description:
        "Category, team and vendor-wise analytics show exactly where your money goes.",
    },
  ],
  benefitsHeading: "Spend less time on expenses",
  benefitsSubtitle:
    "Give finance teams control and employees a frictionless experience — without the month-end scramble.",
  benefits: [
    "Auto-categorised transactions mapped to your ledgers",
    "GST captured on every eligible expense",
    "Real-time budgets and spend alerts",
    "One-click reconciliation with your books",
    "Full audit trail for every transaction",
  ],
  ctaTitle: "Take control of company spend",
  ctaSubtitle:
    "See how Aczen turns expense chaos into a clean, real-time view of your money.",
};

const ExpenseManagement = () => <SolutionTemplate content={content} />;
export default ExpenseManagement;
