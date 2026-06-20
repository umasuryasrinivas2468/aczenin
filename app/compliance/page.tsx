import type { Metadata } from "next";
import Compliance from "@/views/Compliance";

export const metadata: Metadata = {
  title: "Aczen Compliance — GST, TDS, RBI & Data Protection",
  description:
    "Aczen helps Indian businesses stay compliant with GST, TDS, RBI and data protection regulations — automated filings, audit trails and secure storage.",
  keywords:
    "Aczen compliance, GST compliance India, TDS filing, RBI compliance, DPDP Act, audit trail accounting",
  alternates: { canonical: "/compliance" },
  openGraph: {
    title: "Aczen Compliance — GST, TDS, RBI & Data Protection",
    description:
      "Aczen helps Indian businesses stay compliant with GST, TDS, RBI and data protection regulations — automated filings, audit trails and secure storage.",
    url: "/compliance",
  },
};

export default function Page() {
  return <Compliance />;
}
