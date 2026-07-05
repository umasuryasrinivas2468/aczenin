import type { Metadata } from "next";
import CashFlowInsights from "@/views/CashFlowInsights";

export const metadata: Metadata = {
  title: "Cash Flow Insights & Forecasting",
  description:
    "Real-time cash flow analytics and forecasting across inflow and outflow. See runway, spot risks early and make confident financial decisions.",
  alternates: { canonical: "/cash-flow-insights" },
  openGraph: {
    title: "Cash Flow Insights & Forecasting | Aczen",
    description:
      "Real-time cash flow analytics and forecasting. See runway, spot risks early and make confident financial decisions.",
    url: "/cash-flow-insights",
  },
};

export default function Page() {
  return <CashFlowInsights />;
}
