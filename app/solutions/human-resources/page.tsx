import type { Metadata } from "next";
import HumanResources from "@/views/solutions/HumanResources";

export const metadata: Metadata = {
  title: "Aczen for HR & People Teams — Payroll, Expenses & More",
  description:
    "Run payroll, reimburse expenses, manage employee cards and stay compliant with TDS and PF — all connected to your books.",
  alternates: { canonical: "/solutions/human-resources" },
  openGraph: {
    title: "Aczen for HR & People Teams — Payroll, Expenses & More",
    description:
      "Payroll, reimbursements, employee cards and statutory compliance — all connected to your books.",
    url: "/solutions/human-resources",
  },
};

export default function Page() {
  return <HumanResources />;
}
