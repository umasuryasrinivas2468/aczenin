import type { Metadata } from "next";
import Procurement from "@/views/solutions/Procurement";

export const metadata: Metadata = {
  title: "Aczen for Procurement — Purchase to Pay, Controlled",
  description:
    "Raise purchase orders, approve spend, manage vendors and pay bills — a controlled purchase-to-pay flow connected to your books.",
  alternates: { canonical: "/solutions/procurement" },
  openGraph: {
    title: "Aczen for Procurement — Purchase to Pay, Controlled",
    description:
      "Raise POs, enforce approvals, manage vendors and pay bills in one controlled purchase-to-pay flow.",
    url: "/solutions/procurement",
  },
};

export default function Page() {
  return <Procurement />;
}
