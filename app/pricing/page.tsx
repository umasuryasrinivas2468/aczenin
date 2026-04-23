import type { Metadata } from "next";
import Pricing from "@/views/Pricing";

export const metadata: Metadata = {
  title: "Aczen Pricing — Plans for SMEs, CAs, Startups & Enterprises",
  description:
    "Transparent pricing for Aczen's unified financial OS. Start free, upgrade as you grow. Includes GST invoicing, expense tracking, B2B payments and CRM.",
  keywords:
    "Aczen pricing, accounting software pricing India, GST invoicing cost, SME software plans, startup accounting pricing",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Aczen Pricing — Plans for SMEs, CAs, Startups & Enterprises",
    description:
      "Transparent pricing for Aczen's unified financial OS. Start free, upgrade as you grow. Includes GST invoicing, expense tracking, B2B payments and CRM.",
    url: "/pricing",
  },
};

export default function Page() {
  return <Pricing />;
}
