import type { Metadata } from "next";
import SalesMarketing from "@/views/solutions/SalesMarketing";

export const metadata: Metadata = {
  title: "Aczen for Sales & Marketing — Quote, Bill & Get Paid",
  description:
    "Connect your pipeline to your books. Generate quotes and invoices, track deal revenue, collect payments faster and see marketing spend ROI.",
  alternates: { canonical: "/solutions/sales-marketing" },
  openGraph: {
    title: "Aczen for Sales & Marketing — Quote, Bill & Get Paid",
    description:
      "Turn closed deals into invoices, collect payments faster and see what your sales and marketing spend returns.",
    url: "/solutions/sales-marketing",
  },
};

export default function Page() {
  return <SalesMarketing />;
}
