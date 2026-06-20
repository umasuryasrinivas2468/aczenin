import type { Metadata } from "next";
import Index from "@/views/Index";

export const metadata: Metadata = {
  title: "Aczen — Unified Financial OS for SMEs, CAs & Startups in India",
  description:
    "Aczen brings GST invoicing, expense management, B2B payments, accounting and CRM into one platform for Indian businesses. Bank smarter. Scale faster.",
  keywords:
    "Aczen, accounting software India, GST invoicing, expense management, B2B payments, SME accounting software, CA software, startup accounting, Aczen CRM, Aczen OS, e-invoicing India, TDS compliance, financial automation, fintech India",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Aczen — Unified Financial OS for SMEs, CAs & Startups in India",
    description:
      "Aczen brings GST invoicing, expense management, B2B payments, accounting and CRM into one platform for Indian businesses. Bank smarter. Scale faster.",
    type: "website",
    url: "/",
  },
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Aczen",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", priceCurrency: "INR", price: "0" },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    reviewCount: "120",
  },
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <Index />
    </>
  );
}
