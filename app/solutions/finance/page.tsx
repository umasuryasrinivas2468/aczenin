import type { Metadata } from "next";
import Finance from "@/views/solutions/Finance";

export const metadata: Metadata = {
  title: "Aczen for Finance Teams — Close, Report & Control",
  description:
    "Give finance teams a single platform for accounting, cash flow, payments and reporting. Close faster, control spend and stay audit-ready.",
  alternates: { canonical: "/solutions/finance" },
  openGraph: {
    title: "Aczen for Finance Teams — Close, Report & Control",
    description:
      "One connected platform for accounting, cash flow, payments and reporting. Close faster and stay audit-ready.",
    url: "/solutions/finance",
  },
};

export default function Page() {
  return <Finance />;
}
