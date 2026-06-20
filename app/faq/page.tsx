import type { Metadata } from "next";
import FAQ from "@/views/FAQ";

export const metadata: Metadata = {
  title: "Aczen FAQ — Answers on Accounting, GST, Payments & Security",
  description:
    "Frequently asked questions about Aczen's accounting platform: account opening, GST invoicing, B2B payments, fees, security and onboarding support.",
  keywords:
    "Aczen FAQ, Aczen help, accounting software FAQ, GST invoicing questions, Aczen support",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "Aczen FAQ — Answers on Accounting, GST, Payments & Security",
    description:
      "Frequently asked questions about Aczen's accounting platform: account opening, GST invoicing, B2B payments, fees, security and onboarding support.",
    url: "/faq",
  },
};

export default function Page() {
  return <FAQ />;
}
