import type { Metadata } from "next";
import B2BPayments from "@/views/B2BPayments";

const SITE_URL = "https://aczen.in";
const PATH = "/b2b-payments";

export const metadata: Metadata = {
  title: "B2B Payments Platform for India — Vendor Payouts, Bulk Transfers & UPI",
  description:
    "Aczen B2B Payments lets Indian businesses pay vendors, run bulk payouts, automate approvals and reconcile transactions instantly. UPI, NEFT, RTGS, IMPS — one dashboard for every payment.",
  keywords:
    "B2B payments India, vendor payment software, bulk payments, business payments platform, UPI for business, NEFT RTGS automation, accounts payable automation, vendor payout software India",
  alternates: { canonical: PATH },
  openGraph: {
    title: "B2B Payments Platform for India — Aczen",
    description:
      "Pay vendors, run bulk payouts and reconcile every transaction from one dashboard. UPI, NEFT, RTGS, IMPS — built for Indian businesses.",
    url: PATH,
    type: "website",
  },
};

const faqs = [
  {
    q: "What is a B2B payments platform?",
    a: "A B2B payments platform lets businesses pay other businesses — vendors, suppliers, contractors and partners — through a unified dashboard. Aczen B2B Payments supports UPI, NEFT, RTGS, IMPS and bulk file uploads, with built-in approvals, GST-tagged transactions and automatic reconciliation against your accounting books.",
  },
  {
    q: "Which payment modes does Aczen support?",
    a: "Aczen supports UPI, NEFT, RTGS, IMPS, virtual account transfers and bulk payout files for over 100 Indian banks. Cross-border payouts are available on enterprise plans.",
  },
  {
    q: "Can Aczen automate vendor payouts?",
    a: "Yes. Schedule recurring payouts, set up multi-level approval workflows, deduct TDS automatically and trigger payments directly from approved bills. Payouts can run on a fixed date or be triggered by invoice approval.",
  },
  {
    q: "How does Aczen reconcile B2B payments?",
    a: "Every payment is auto-tagged to the originating bill or PO. Bank feeds match outgoing transfers to ledgers in real time, and any mismatches are flagged for review. This eliminates the manual reconciliation that traditional banking dashboards require.",
  },
  {
    q: "Is Aczen B2B Payments secure?",
    a: "Aczen is RBI-compliant, uses bank-grade AES-256 encryption, supports 2FA and maker-checker workflows, and is hosted on ISO 27001 certified infrastructure within India. Every transaction is logged with a full audit trail.",
  },
  {
    q: "Can I deduct TDS on vendor payments automatically?",
    a: "Yes. Configure TDS rates per vendor or per invoice category, and Aczen automatically deducts TDS at the moment of payout, posts to the TDS payable ledger and prepares Form 26Q/27Q for filing.",
  },
];

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Aczen B2B Payments",
  applicationCategory: "FinanceApplication",
  applicationSubCategory: "PaymentSoftware",
  operatingSystem: "Web, iOS, Android",
  description:
    "Aczen B2B Payments is a unified platform for Indian businesses to pay vendors, run bulk payouts, automate approvals and reconcile transactions. Supports UPI, NEFT, RTGS and IMPS.",
  url: `${SITE_URL}${PATH}`,
  offers: { "@type": "Offer", priceCurrency: "INR", price: "0" },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    reviewCount: "98",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "B2B Payments", item: `${SITE_URL}${PATH}` },
  ],
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <B2BPayments />
    </>
  );
}
