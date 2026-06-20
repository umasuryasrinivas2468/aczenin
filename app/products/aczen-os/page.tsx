import type { Metadata } from "next";
import AczenOS from "@/views/products/AczenOS";

export const metadata: Metadata = {
  title: "Aczen OS — Unified Financial Operating System for Business",
  description:
    "Aczen OS ties accounting, invoicing, payments, compliance and CRM into a single operating system for Indian businesses.",
  keywords:
    "Aczen OS, financial operating system, business OS India, unified accounting platform",
  alternates: { canonical: "/products/aczen-os" },
  openGraph: {
    title: "Aczen OS — Unified Financial Operating System for Business",
    description:
      "Aczen OS ties accounting, invoicing, payments, compliance and CRM into a single operating system for Indian businesses.",
    url: "/products/aczen-os",
  },
};

export default function Page() {
  return <AczenOS />;
}
