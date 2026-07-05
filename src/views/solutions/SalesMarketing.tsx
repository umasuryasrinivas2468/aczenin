"use client";

import {
  Megaphone,
  Users,
  FileText,
  CreditCard,
  TrendingUp,
  Target,
  Repeat,
} from "lucide-react";
import SolutionTemplate, { type SolutionContent } from "@/views/SolutionTemplate";

const content: SolutionContent = {
  path: "/solutions/sales-marketing",
  seo: {
    title: "Aczen for Sales & Marketing — Quote, Bill & Get Paid",
    description:
      "Connect your pipeline to your books. Generate quotes and invoices, track deal revenue, collect payments faster and see marketing spend ROI.",
    keywords:
      "sales and marketing finance, CRM billing, quote to cash, revenue tracking, marketing spend ROI, Aczen for sales",
  },
  eyebrow: "Sales & Marketing",
  icon: Megaphone,
  title: "From pipeline",
  titleHighlight: "to paid, faster.",
  subtitle:
    "Turn closed deals into invoices in a click, collect payments faster and see exactly what your sales and marketing spend returns.",
  stats: [
    { value: "40%", label: "faster collections" },
    { value: "Quote→Cash", label: "in one flow" },
    { value: "Live", label: "revenue view" },
    { value: "ROI", label: "on every campaign" },
  ],
  features: [
    {
      icon: FileText,
      title: "Quotes & invoices",
      description:
        "Send branded, GST-ready quotes and convert them to invoices instantly on close.",
    },
    {
      icon: CreditCard,
      title: "Fast collections",
      description:
        "Share payment links with UPI, cards and net-banking to get paid sooner.",
    },
    {
      icon: Users,
      title: "CRM connected",
      description:
        "Aczen Eco CRM links every customer to their invoices, payments and history.",
    },
    {
      icon: TrendingUp,
      title: "Revenue tracking",
      description:
        "See booked, invoiced and collected revenue by rep, product and region.",
    },
    {
      icon: Target,
      title: "Campaign ROI",
      description:
        "Tie marketing spend to revenue so you know what's actually working.",
    },
    {
      icon: Repeat,
      title: "Subscriptions",
      description:
        "Automate recurring billing and reminders for retainers and subscriptions.",
    },
  ],
  benefitsHeading: "Close the loop between selling and getting paid",
  benefitsSubtitle:
    "No more re-keying deals into finance tools or chasing payments by email.",
  benefits: [
    "One-click quote-to-invoice from your pipeline",
    "Automated payment reminders and follow-ups",
    "Customer-level revenue and payment history",
    "Marketing spend mapped to real revenue",
    "Recurring billing for retainers and plans",
  ],
  ctaTitle: "Turn deals into revenue, faster",
  ctaSubtitle:
    "See how Aczen connects your sales pipeline straight to your books.",
};

const SalesMarketing = () => <SolutionTemplate content={content} />;
export default SalesMarketing;
