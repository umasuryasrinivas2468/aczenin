import type { Metadata } from "next";
import TermsOfService from "@/views/TermsOfService";

export const metadata: Metadata = {
  title: "Terms of Service — Aczen Technologies",
  description:
    "Read the terms of service that govern your use of Aczen's unified financial OS, products and APIs.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Service — Aczen Technologies",
    description:
      "Read the terms of service that govern your use of Aczen's unified financial OS, products and APIs.",
    url: "/terms",
  },
};

export default function Page() {
  return <TermsOfService />;
}
