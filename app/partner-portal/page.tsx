import type { Metadata } from "next";
import PartnerPortal from "@/views/PartnerPortal";

export const metadata: Metadata = {
  title: "Aczen Partner Portal",
  description: "Secure portal for Aczen partners — resources, dashboards and tools.",
  alternates: { canonical: "/partner-portal" },
  robots: { index: false, follow: false },
};

export default function Page() {
  return <PartnerPortal />;
}
