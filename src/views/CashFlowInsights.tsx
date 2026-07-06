"use client";

import {
  LineChart,
  TrendingUp,
  BarChart3,
  Bell,
  CalendarClock,
  Banknote,
} from "lucide-react";
import SolutionTemplate, { type SolutionContent } from "@/views/SolutionTemplate";

const content: SolutionContent = {
  path: "/cash-flow-insights",
  seo: {
    title: "Cash Flow Insights & Forecasting — Aczen",
    description:
      "Real-time cash flow analytics and forecasting across inflow and outflow. See runway, spot risks early and make confident financial decisions.",
    keywords:
      "cash flow forecasting, cash flow management India, business analytics, runway, financial forecasting software, Aczen insights",
  },
  eyebrow: "Cash Flow Insights",
  icon: LineChart,
  title: "Forecast your",
  titleHighlight: "cash with confidence.",
  subtitle:
    "Real-time analytics across inflow and outflow, with forecasting that shows your runway and flags risks before they become problems.",
  stats: [
    { value: "13-week", label: "cash forecast" },
    { value: "Live", label: "inflow & outflow" },
    { value: "AI", label: "driven predictions" },
    { value: "1-click", label: "scenario planning" },
  ],
  features: [
    {
      icon: TrendingUp,
      title: "Live cash position",
      description:
        "See your consolidated cash balance across accounts, updated in real time.",
    },
    {
      icon: LineChart,
      title: "Forecasting",
      description:
        "Project cash flow weeks and months ahead using your invoices, bills and trends.",
    },
    {
      icon: BarChart3,
      title: "Inflow vs outflow",
      description:
        "Visualise where money comes from and goes, by category, customer and vendor.",
    },
    {
      icon: CalendarClock,
      title: "Runway tracking",
      description:
        "Know exactly how many months of runway you have at your current burn rate.",
    },
    {
      icon: Bell,
      title: "Smart alerts",
      description:
        "Get notified about low balances, large outflows and unusual spending patterns.",
    },
    {
      icon: Banknote,
      title: "Scenario planning",
      description:
        "Model hiring, new revenue or a big purchase and see the impact instantly.",
    },
  ],
  benefitsHeading: "Never be surprised by your cash again",
  benefitsSubtitle:
    "Turn scattered numbers into a clear, forward-looking picture of your finances.",
  benefits: [
    "Consolidated view across all bank accounts",
    "Predictive forecasts powered by your own data",
    "Early-warning alerts for cash crunches",
    "Drill down from summary to single transaction",
    "Board-ready charts you can export in seconds",
  ],
  ctaTitle: "See where your cash is headed",
  ctaSubtitle:
    "Make faster, more confident decisions with a real-time view of your money.",
};

const CashFlowInsights = () => <SolutionTemplate content={content} />;
export default CashFlowInsights;
