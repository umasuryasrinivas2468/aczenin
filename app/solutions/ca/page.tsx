import type { Metadata } from "next";
import CA from "@/views/solutions/CA";

export const metadata: Metadata = {
  title: "Aczen for Chartered Accountants — Practice Management Software",
  description:
    "Built for CAs: multi-client dashboards, GST filings, TDS compliance, financial reports and secure document storage.",
  keywords:
    "CA software India, chartered accountant software, practice management CA, GST filing software, TDS filing CA",
  alternates: { canonical: "/solutions/ca" },
  openGraph: {
    title: "Aczen for Chartered Accountants — Practice Management Software",
    description:
      "Built for CAs: multi-client dashboards, GST filings, TDS compliance, financial reports and secure document storage.",
    url: "/solutions/ca",
  },
};

export default function Page() {
  return <CA />;
}
