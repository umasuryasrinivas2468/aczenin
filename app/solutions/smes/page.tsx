import type { Metadata } from "next";
import SMEs from "@/views/solutions/SMEs";

export const metadata: Metadata = {
  title: "Aczen for SMEs — Banking, Invoicing & Payments for Indian SMEs",
  description:
    "Aczen gives small and medium enterprises everything they need: current accounts, GST invoicing, expense tracking, B2B payments and compliance.",
  keywords:
    "SME accounting software India, Aczen for SMEs, SME banking solutions, small business software, MSME digital banking",
  alternates: { canonical: "/solutions/smes" },
  openGraph: {
    title: "Aczen for SMEs — Banking, Invoicing & Payments for Indian SMEs",
    description:
      "Aczen gives small and medium enterprises everything they need: current accounts, GST invoicing, expense tracking, B2B payments and compliance.",
    url: "/solutions/smes",
  },
};

export default function Page() {
  return <SMEs />;
}
