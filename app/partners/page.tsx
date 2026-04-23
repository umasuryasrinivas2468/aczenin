import type { Metadata } from "next";
import Partners from "@/views/Partners";

export const metadata: Metadata = {
  title: "Aczen Partners — Banking, Payments & Channel Partnerships",
  description:
    "Aczen partners with leading banks, payment providers and channel partners — Axis Bank, Cashfree, Augoment and more — to power India's financial OS.",
  keywords:
    "Aczen partners, fintech partnerships India, Axis Bank Aczen, Cashfree Aczen, channel partner program",
  alternates: { canonical: "/partners" },
  openGraph: {
    title: "Aczen Partners — Banking, Payments & Channel Partnerships",
    description:
      "Aczen partners with leading banks, payment providers and channel partners — Axis Bank, Cashfree, Augoment and more — to power India's financial OS.",
    url: "/partners",
  },
};

export default function Page() {
  return <Partners />;
}
