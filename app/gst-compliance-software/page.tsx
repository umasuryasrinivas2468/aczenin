import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Check,
  X,
  FileCheck,
  ShieldCheck,
  Calendar,
  Upload,
  AlertTriangle,
  RefreshCw,
  Users,
  ArrowRight,
} from "lucide-react";

const SITE_URL = "https://aczen.in";
const PATH = "/gst-compliance-software";

export const metadata: Metadata = {
  title: "GST Compliance Software — File GSTR-1, GSTR-3B & GSTR-9 in Minutes | Aczen",
  description:
    "Aczen is the all-in-one GST compliance software for Indian businesses. File GSTR-1, GSTR-3B, GSTR-9, generate IRN-validated e-invoices and e-way bills, and reconcile GSTR-2B in minutes — not days.",
  keywords:
    "GST compliance software, GST return filing software, GSTR-1 software, GSTR-3B software, GSTR-9 software, e-invoicing software India, e-way bill software, GST reconciliation, GSTR-2B reconciliation, GST software for CA",
  alternates: { canonical: PATH },
  openGraph: {
    title: "GST Compliance Software for Indian Businesses — Aczen",
    description:
      "File GSTR-1, GSTR-3B, GSTR-9 and generate e-invoices in minutes. Built for SMEs, CAs and enterprises.",
    url: PATH,
    type: "website",
  },
};

const features = [
  {
    icon: FileCheck,
    title: "GSTR-1, 3B & 9 Filing",
    description:
      "Auto-prepare every return from your transaction data. One-click filing direct to the GSTN portal — no copy-pasting, no JSON uploads.",
  },
  {
    icon: Upload,
    title: "E-Invoicing & IRN",
    description:
      "Generate IRN-validated e-invoices in real time for every B2B sale. QR codes, signed JSON and IRP integration are automatic.",
  },
  {
    icon: RefreshCw,
    title: "GSTR-2B Reconciliation",
    description:
      "Match purchase invoices to GSTR-2B in seconds. Flag missing ITC, mismatched values and supplier non-filers before they cost you credit.",
  },
  {
    icon: Calendar,
    title: "E-Way Bill Generation",
    description:
      "Generate, extend, cancel and consolidate e-way bills directly from invoices. Multi-vehicle and multi-transporter scenarios are handled.",
  },
  {
    icon: ShieldCheck,
    title: "TDS, TCS & Form 26AS",
    description:
      "Auto-deduct TDS on vendor payments, generate Form 26Q/27Q exports and reconcile against Form 26AS to claim every rupee of credit.",
  },
  {
    icon: AlertTriangle,
    title: "Compliance Calendar",
    description:
      "Never miss a due date. Aczen tracks every GST, TDS and ROC deadline for your GSTIN and sends alerts well before the cutoff.",
  },
];

const comparisonRows = [
  { feature: "GSTR-1 / 3B / 9 filing", aczen: true, clearTax: true, tally: true },
  { feature: "Direct GSTN portal filing", aczen: true, clearTax: true, tally: false },
  { feature: "Real-time e-invoicing (IRN)", aczen: true, clearTax: true, tally: true },
  { feature: "GSTR-2B auto-reconciliation", aczen: true, clearTax: true, tally: false },
  { feature: "Built-in accounting & invoicing", aczen: true, clearTax: false, tally: true },
  { feature: "B2B payments + TDS in one platform", aczen: true, clearTax: false, tally: false },
  { feature: "Multi-GSTIN consolidation", aczen: true, clearTax: true, tally: true },
  { feature: "Cloud-native (no installs)", aczen: true, clearTax: true, tally: false },
];

const faqs = [
  {
    q: "What is GST compliance software?",
    a: "GST compliance software is a tool that helps Indian businesses generate GST-compliant invoices, file GST returns (GSTR-1, GSTR-3B, GSTR-9), reconcile input tax credit against GSTR-2B, and meet e-invoicing and e-way bill obligations. Aczen does all of this from a single dashboard.",
  },
  {
    q: "Can Aczen file GST returns directly to the GSTN portal?",
    a: "Yes. Aczen is a GSP-integrated platform — once your return is prepared, you can file it to the GSTN portal with a single click using OTP or DSC. No JSON uploads or manual copy-paste.",
  },
  {
    q: "Does Aczen support e-invoicing for businesses above the Rs. 5 crore turnover threshold?",
    a: "Yes. Aczen automatically generates IRN-validated e-invoices for every B2B sale, attaches the QR code, and submits to the IRP in real time. The threshold has been progressively reduced — Aczen handles the latest CBIC limits.",
  },
  {
    q: "How does GSTR-2B reconciliation work in Aczen?",
    a: "Aczen pulls your GSTR-2B from the GSTN portal and automatically matches it against your purchase ledger. Mismatches are categorised — missing in 2B, missing in books, value mismatch, GSTIN mismatch — so your team can take targeted action and never lose ITC.",
  },
  {
    q: "Is Aczen suitable for chartered accountants managing multiple clients?",
    a: "Yes. Aczen is widely used by CAs to manage 100+ client GSTINs from a single login. White-label invoicing, consolidated dashboards, bulk return filing and client-level audit trails are all built in.",
  },
  {
    q: "What happens if I file a return late or with errors?",
    a: "Aczen flags errors before submission and shows you the exact field that's invalid. If a return has already been filed, you can amend it through the standard GST amendment workflows directly from the platform.",
  },
];

const useCases = [
  {
    title: "Chartered Accountants",
    href: "/solutions/ca",
    description: "Manage GSTRs for 100+ clients with bulk filing, white-label invoicing and client-level audit trails.",
  },
  {
    title: "SMEs & MSMEs",
    href: "/solutions/smes",
    description: "Stay GST compliant without hiring a full-time accountant. Returns filed in minutes, not days.",
  },
  {
    title: "Enterprises",
    href: "/solutions/enterprises",
    description: "Multi-GSTIN, multi-state and multi-entity GST compliance from one consolidated dashboard.",
  },
  {
    title: "Startups",
    href: "/solutions/startups",
    description: "GST-ready from day one. Automated filings free up founder time for what actually matters.",
  },
];

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Aczen GST Compliance Software",
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "TaxPreparationSoftware",
  operatingSystem: "Web",
  description:
    "Aczen GST Compliance Software helps Indian businesses file GSTR-1, GSTR-3B and GSTR-9, generate IRN-validated e-invoices, generate e-way bills and reconcile GSTR-2B from a single dashboard.",
  url: `${SITE_URL}${PATH}`,
  offers: { "@type": "Offer", priceCurrency: "INR", price: "0" },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "87",
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
    { "@type": "ListItem", position: 2, name: "GST Compliance Software", item: `${SITE_URL}${PATH}` },
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

      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 mb-8">
            <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-sm">
              <Link href="/" className="text-gray-500 hover:text-gray-700">Home</Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900">GST Compliance Software</span>
            </nav>
          </div>

          <section className="container mx-auto px-4 mb-20">
            <div className="max-w-4xl">
              <span className="inline-block bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-medium mb-6">
                GSP-Integrated GST Software
              </span>
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                GST Compliance Software for Indian Businesses
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                File GSTR-1, GSTR-3B and GSTR-9, generate IRN-validated e-invoices, create e-way bills and
                reconcile GSTR-2B — all from one dashboard. Built for SMEs, CAs and enterprises.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/start"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-md font-medium transition-colors flex items-center justify-center"
                >
                  Start Free <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
                <a
                  href="https://cal.com/aczen-technologies-pvt-ltd-t7jdhz/30min"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-emerald-600 text-emerald-700 hover:bg-emerald-50 px-8 py-3 rounded-md font-medium text-center"
                >
                  Book a Demo
                </a>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-gray-500">
                <span className="flex items-center"><Check className="w-4 h-4 text-emerald-600 mr-2" /> Direct GSTN filing</span>
                <span className="flex items-center"><Check className="w-4 h-4 text-emerald-600 mr-2" /> Real-time e-invoicing</span>
                <span className="flex items-center"><Check className="w-4 h-4 text-emerald-600 mr-2" /> GSTR-2B reconciliation</span>
              </div>
            </div>
          </section>

          <section className="container mx-auto px-4 mb-20">
            <div className="max-w-3xl mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Every GST workflow, automated
              </h2>
              <p className="text-lg text-gray-600">
                From the first invoice you generate to the GSTR-9 you file at year-end, Aczen handles every
                touchpoint of GST compliance — without spreadsheets, JSON files or last-minute panic.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f) => (
                <div key={f.title} className="bg-white p-6 rounded-lg border border-gray-200 hover:border-emerald-300 hover:shadow-md transition">
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                    <f.icon className="w-6 h-6 text-emerald-700" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-gray-600">{f.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="container mx-auto px-4 mb-20">
            <div className="max-w-3xl mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Aczen vs ClearTax vs Tally
              </h2>
              <p className="text-lg text-gray-600">
                The most-used GST software in India compared on the features that matter for filing,
                reconciliation and ITC recovery.
              </p>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-700">Feature</th>
                    <th className="px-6 py-4 text-sm font-semibold text-emerald-700">Aczen</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-700">ClearTax</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-700">Tally</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {comparisonRows.map((r) => (
                    <tr key={r.feature} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-700">{r.feature}</td>
                      <td className="px-6 py-4">{r.aczen ? <Check className="w-5 h-5 text-emerald-600" /> : <X className="w-5 h-5 text-gray-300" />}</td>
                      <td className="px-6 py-4">{r.clearTax ? <Check className="w-5 h-5 text-gray-600" /> : <X className="w-5 h-5 text-gray-300" />}</td>
                      <td className="px-6 py-4">{r.tally ? <Check className="w-5 h-5 text-gray-600" /> : <X className="w-5 h-5 text-gray-300" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="container mx-auto px-4 mb-20">
            <div className="max-w-3xl mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Built for every GST taxpayer
              </h2>
              <p className="text-lg text-gray-600">
                One platform — whether you file one return a quarter or a thousand a month.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {useCases.map((u) => (
                <Link
                  key={u.href}
                  href={u.href}
                  className="block bg-gradient-to-br from-emerald-50 to-white p-6 rounded-lg border border-emerald-100 hover:border-emerald-300 hover:shadow-md transition"
                >
                  <Users className="w-8 h-8 text-emerald-700 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{u.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{u.description}</p>
                  <span className="text-sm text-emerald-700 font-medium flex items-center">
                    Learn more <ArrowRight className="w-3 h-3 ml-1" />
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="container mx-auto px-4 mb-20">
            <div className="max-w-3xl mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Why teams switch to Aczen for GST
              </h2>
              <p className="text-lg text-gray-600">
                Most GST software is a filing tool bolted onto a separate accounting product. Aczen is one
                system — your books, GST, payments and banking live together, so reconciliation is real-time.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <RefreshCw className="w-8 h-8 text-emerald-700 mb-3" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Recover every rupee of ITC</h3>
                <p className="text-gray-600">
                  Aczen's GSTR-2B reconciliation flags missing supplier filings, value mismatches and
                  GSTIN errors before the 20th. Most teams discover 2–5% additional ITC in the first month.
                </p>
              </div>
              <div>
                <Calendar className="w-8 h-8 text-emerald-700 mb-3" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Never miss a deadline</h3>
                <p className="text-gray-600">
                  GSTR-1, GSTR-3B, GSTR-9, TDS due dates, ROC filings — Aczen tracks every deadline for
                  every GSTIN and sends escalating alerts so nothing slips.
                </p>
              </div>
              <div>
                <Upload className="w-8 h-8 text-emerald-700 mb-3" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-time e-invoicing</h3>
                <p className="text-gray-600">
                  IRN, QR code and signed JSON are generated at the moment of invoice creation — not in a
                  batch job at end-of-day. Cancel and amend within the GSTN-allowed windows.
                </p>
              </div>
              <div>
                <ShieldCheck className="w-8 h-8 text-emerald-700 mb-3" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Audit-ready always</h3>
                <p className="text-gray-600">
                  Every change is logged with user, timestamp and field-level diff. Department audits and
                  due-diligence requests take hours instead of weeks.
                </p>
              </div>
            </div>
          </section>

          <section className="container mx-auto px-4 mb-20">
            <div className="max-w-3xl mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Frequently asked questions
              </h2>
              <p className="text-lg text-gray-600">
                Everything you wanted to know about Aczen GST compliance software.
              </p>
            </div>
            <div className="max-w-4xl space-y-4">
              {faqs.map((f) => (
                <details key={f.q} className="group bg-white border border-gray-200 rounded-lg p-6 hover:border-emerald-300 transition">
                  <summary className="flex items-center justify-between cursor-pointer text-lg font-semibold text-gray-900">
                    {f.q}
                    <span className="ml-4 text-emerald-600 group-open:rotate-45 transition-transform text-2xl leading-none">+</span>
                  </summary>
                  <p className="mt-4 text-gray-600 leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="container mx-auto px-4">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl p-8 md:p-12 text-center text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                File your next GST return with Aczen
              </h2>
              <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
                Free starter plan. Set up your GSTIN in minutes. File GSTR-1 directly to GSTN today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/start"
                  className="bg-white text-emerald-700 px-8 py-3 rounded-md font-medium hover:bg-gray-100 transition-colors"
                >
                  Start Free
                </Link>
                <a
                  href="https://cal.com/aczen-technologies-pvt-ltd-t7jdhz/30min"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-white text-white hover:bg-white hover:text-emerald-700 px-8 py-3 rounded-md font-medium transition-colors"
                >
                  Book a Demo
                </a>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
}
