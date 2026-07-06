"use client";

import {
  Users,
  Banknote,
  Wallet,
  CreditCard,
  CalendarClock,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import SolutionTemplate, { type SolutionContent } from "@/views/SolutionTemplate";

const content: SolutionContent = {
  path: "/solutions/human-resources",
  seo: {
    title: "Aczen for HR & People Teams — Payroll, Expenses & More",
    description:
      "Run payroll, reimburse expenses, manage employee cards and stay compliant with TDS and PF — all connected to your books.",
    keywords:
      "HR payroll software India, payroll and expenses, employee reimbursement, TDS PF compliance, Aczen for HR",
  },
  eyebrow: "Human Resources",
  icon: Users,
  title: "Pay and support",
  titleHighlight: "your people, effortlessly.",
  subtitle:
    "Run payroll, reimburse expenses, issue employee cards and stay compliant — with everything flowing straight into your books.",
  stats: [
    { value: "1-click", label: "payroll runs" },
    { value: "Auto", label: "TDS & PF" },
    { value: "Same-day", label: "reimbursements" },
    { value: "Zero", label: "manual entry" },
  ],
  features: [
    {
      icon: Banknote,
      title: "Payroll",
      description:
        "Run accurate payroll with automatic salary, deductions and disbursal.",
    },
    {
      icon: ShieldCheck,
      title: "Statutory compliance",
      description:
        "TDS, PF, ESI and professional tax calculated and filed automatically.",
    },
    {
      icon: Wallet,
      title: "Reimbursements",
      description:
        "Approve and pay employee claims same-day, straight to their accounts.",
    },
    {
      icon: CreditCard,
      title: "Employee cards",
      description:
        "Issue spend cards with limits so teams can buy what they need, safely.",
    },
    {
      icon: CalendarClock,
      title: "Scheduled runs",
      description:
        "Schedule salaries and recurring payouts in advance with approvals built in.",
    },
    {
      icon: UserPlus,
      title: "Easy onboarding",
      description:
        "Add employees in minutes and connect them to payroll and expenses instantly.",
    },
  ],
  benefitsHeading: "HR and finance, finally in sync",
  benefitsSubtitle:
    "Everything you pay your people flows into your books automatically.",
  benefits: [
    "Payroll that posts straight to your ledgers",
    "Automatic statutory deductions and filings",
    "Same-day expense reimbursements",
    "Employee cards with spend controls",
    "A single record per employee across pay and spend",
  ],
  ctaTitle: "Take the pain out of paying people",
  ctaSubtitle:
    "See how Aczen connects payroll, expenses and compliance in one place.",
};

const HumanResources = () => <SolutionTemplate content={content} />;
export default HumanResources;
