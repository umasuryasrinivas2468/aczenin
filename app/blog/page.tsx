import type { Metadata } from "next";
import Blog from "@/views/Blog";

export const metadata: Metadata = {
  title: "Aczen Blog — Insights on Accounting, GST, Fintech & SME Growth",
  description:
    "The Aczen blog: practical guides on GST invoicing, TDS, B2B payments, accounting automation, and growth tips for Indian SMEs, startups and CAs.",
  keywords:
    "Aczen blog, accounting blog India, GST guide, fintech blog, SME growth, startup accounting tips, CA resources",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Aczen Blog — Insights on Accounting, GST, Fintech & SME Growth",
    description:
      "The Aczen blog: practical guides on GST invoicing, TDS, B2B payments, accounting automation, and growth tips for Indian SMEs, startups and CAs.",
    url: "/blog",
  },
};

const blogJsonLd = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "Aczen Blog",
  url: "https://aczen.in/blog",
  publisher: {
    "@type": "Organization",
    name: "Aczen Technologies Pvt Ltd",
    logo: "https://aczen.in/images/aczenimg.jpeg",
  },
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />
      <Blog />
    </>
  );
}
