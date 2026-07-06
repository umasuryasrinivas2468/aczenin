import type { Metadata } from "next";
import OperationsAdmin from "@/views/solutions/OperationsAdmin";

export const metadata: Metadata = {
  title: "Aczen for Operations & Admin — Automate the Busywork",
  description:
    "Automate approvals, vendor payments and recurring tasks. Give operations and admin teams a single dashboard to run the business day to day.",
  alternates: { canonical: "/solutions/operations-admin" },
  openGraph: {
    title: "Aczen for Operations & Admin — Automate the Busywork",
    description:
      "Automate approvals, vendor payments and recurring tasks from a single operations control panel.",
    url: "/solutions/operations-admin",
  },
};

export default function Page() {
  return <OperationsAdmin />;
}
