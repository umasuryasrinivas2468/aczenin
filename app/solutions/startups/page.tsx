import type { Metadata } from "next";
import Startups from "@/views/solutions/Startups";

export const metadata: Metadata = {
  title: "Aczen for Startups — Accounting, Banking & Cap Table Ready",
  description:
    "Startup-ready: zero-fee current accounts, investor-friendly reports, burn tracking, GST invoicing and cap table integrations.",
  keywords:
    "startup accounting India, Aczen for startups, startup banking, cap table India, zero-fee current account",
  alternates: { canonical: "/solutions/startups" },
  openGraph: {
    title: "Aczen for Startups — Accounting, Banking & Cap Table Ready",
    description:
      "Startup-ready: zero-fee current accounts, investor-friendly reports, burn tracking, GST invoicing and cap table integrations.",
    url: "/solutions/startups",
  },
};

export default function Page() {
  return <Startups />;
}
