"use client";

import {
  ShoppingCart,
  FileText,
  Workflow,
  Building2,
  CreditCard,
  ShieldCheck,
  BarChart3,
} from "lucide-react";
import SolutionTemplate, { type SolutionContent } from "@/views/SolutionTemplate";

const content: SolutionContent = {
  path: "/solutions/procurement",
  seo: {
    title: "Aczen for Procurement — Purchase to Pay, Controlled",
    description:
      "Raise purchase orders, approve spend, manage vendors and pay bills — a controlled purchase-to-pay flow connected to your books.",
    keywords:
      "procurement software India, purchase to pay, purchase orders, vendor management, spend control, Aczen procurement",
  },
  eyebrow: "Procurement",
  icon: ShoppingCart,
  title: "Purchase-to-pay,",
  titleHighlight: "fully under control.",
  subtitle:
    "Raise purchase orders, enforce approvals, manage vendors and pay bills — one controlled flow that keeps spend in check and books accurate.",
  stats: [
    { value: "100%", label: "spend visibility" },
    { value: "PO-backed", label: "purchases" },
    { value: "3-way", label: "matching" },
    { value: "Faster", label: "vendor payouts" },
  ],
  features: [
    {
      icon: FileText,
      title: "Purchase orders",
      description:
        "Create and track POs, and match them against invoices and receipts.",
    },
    {
      icon: Workflow,
      title: "Approval controls",
      description:
        "Enforce spend limits and approval chains before any commitment is made.",
    },
    {
      icon: Building2,
      title: "Vendor management",
      description:
        "Onboard vendors, store details and track every transaction in one place.",
    },
    {
      icon: ShieldCheck,
      title: "3-way matching",
      description:
        "Match PO, invoice and goods received automatically to catch discrepancies.",
    },
    {
      icon: CreditCard,
      title: "Bill payments",
      description:
        "Pay approved bills via NEFT, RTGS and IMPS, scheduled or on demand.",
    },
    {
      icon: BarChart3,
      title: "Spend analytics",
      description:
        "Analyse spend by vendor, category and team to negotiate and save.",
    },
  ],
  benefitsHeading: "Control spend before it happens",
  benefitsSubtitle:
    "Move from reactive bill-paying to a proactive, PO-driven procurement process.",
  benefits: [
    "Every purchase backed by an approved PO",
    "Spend limits enforced automatically",
    "Automated 3-way matching before payment",
    "Centralised vendor records and history",
    "Bills that reconcile straight into your books",
  ],
  ctaTitle: "Bring discipline to your spend",
  ctaSubtitle:
    "See how Aczen turns procurement into a clean, controlled purchase-to-pay flow.",
};

const Procurement = () => <SolutionTemplate content={content} />;
export default Procurement;
