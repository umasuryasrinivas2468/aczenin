import type { Metadata } from "next";
import Freelancers from "@/views/solutions/Freelancers";

export const metadata: Metadata = {
  title: "Aczen for Freelancers — Invoicing, GST & Payments",
  description:
    "Everything freelancers need: GST-compliant invoicing, client payments, expense tracking and simple tax filings — in one app.",
  keywords:
    "freelancer invoicing India, Aczen for freelancers, GST for freelancers, independent contractor accounting",
  alternates: { canonical: "/solutions/freelancers" },
  openGraph: {
    title: "Aczen for Freelancers — Invoicing, GST & Payments",
    description:
      "Everything freelancers need: GST-compliant invoicing, client payments, expense tracking and simple tax filings — in one app.",
    url: "/solutions/freelancers",
  },
};

export default function Page() {
  return <Freelancers />;
}
