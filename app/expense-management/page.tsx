import type { Metadata } from "next";
import ExpenseManagement from "@/views/ExpenseManagement";

export const metadata: Metadata = {
  title: "Expense Management Software — Track & Control Spend",
  description:
    "Capture receipts, issue corporate cards, enforce spend policies and reimburse employees fast. Real-time visibility into every rupee your business spends.",
  alternates: { canonical: "/expense-management" },
  openGraph: {
    title: "Expense Management Software — Track & Control Spend | Aczen",
    description:
      "Capture receipts, issue corporate cards, enforce spend policies and reimburse employees fast — with real-time spend visibility.",
    url: "/expense-management",
  },
};

export default function Page() {
  return <ExpenseManagement />;
}
