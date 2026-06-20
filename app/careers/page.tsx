import type { Metadata } from "next";
import Careers from "@/views/Careers";

export const metadata: Metadata = {
  title: "Careers at Aczen — Join India's Unified Financial OS Team",
  description:
    "Build the future of fintech with Aczen. Explore open engineering, design, sales and operations roles across our India offices.",
  keywords:
    "Aczen careers, fintech jobs India, Aczen hiring, engineering jobs, product jobs, startup careers",
  alternates: { canonical: "/careers" },
  openGraph: {
    title: "Careers at Aczen — Join India's Unified Financial OS Team",
    description:
      "Build the future of fintech with Aczen. Explore open engineering, design, sales and operations roles across our India offices.",
    url: "/careers",
  },
};

export default function Page() {
  return <Careers />;
}
