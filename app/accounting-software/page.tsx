import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Check,
  X,
  FileText,
  Calculator,
  Receipt,
  ShieldCheck,
  TrendingUp,
  Users,
  Banknote,
  Clock,
  ArrowRight,
} from "lucide-react";

const SITE_URL = "https://aczen.in";
const PATH = "/accounting-software";

export const metadata: Metadata = {
  title: "Best Accounting Software for Indian Businesses — Aczen",
  description:
    "Aczen is the best accounting software for Indian SMEs, CAs, startups and freelancers — GST invoicing, automated bookkeeping, TDS, bank reconciliation and real-time financial reports in one platform.",
  keywords:
    "best accounting software India, online accounting software, accounting software for small business, GST accounting software, cloud accounting software India, bookkeeping software, Tally alternative, Zoho Books alternative",
  alternates: { canonical: PATH },
  openGraph: {
    title: "Best Accounting Software for Indian Businesses — Aczen",
    description:
      "GST-ready accounting, automated bookkeeping, TDS, bank reconciliation and real-time reports — built for Indian SMEs, CAs and startups.",
    url: PATH,
    type: "website",
  },
};

const features = [
  {
    icon: FileText,
    title: "GST-Ready Invoicing",
    description:
      "Generate GST-compliant invoices, e-invoices and e-way bills in seconds. Auto-calculates CGST, SGST, IGST and prints with your business letterhead.",
  },
  {
    icon: Calculator,
    title: "Automated Bookkeeping",
    description:
      "Bank feeds auto-categorize transactions. Ledgers, journals and trial balance update in real time — no manual data entry.",
  },
  {
    icon: Receipt,
    title: "Expense Management",
    description:
      "Capture bills with OCR, route approvals, and post directly to expense ledgers. Track vendor liabilities and ageing.",
  },
  {
    icon: ShieldCheck,
    title: "TDS & Compliance",
    description:
      "Automatic TDS deduction on vendor payments, Form 26Q/27Q exports, GSTR-1, GSTR-3B and GSTR-9 filing — all from one dashboard.",
  },
  {
    icon: Banknote,
    title: "Bank Reconciliation",
    description:
      "Connect any Indian bank — ICICI, HDFC, SBI, Axis, Kotak — and reconcile statements with one click. Flags mismatches automatically.",
  },
  {
    icon: TrendingUp,
    title: "Real-Time Financials",
    description:
      "P&L, balance sheet, cash flow and 30+ MIS reports update live. Drill down from any number to the underlying voucher.",
  },
];

const comparisonRows = [
  { feature: "GST invoicing & e-invoicing", aczen: true, tally: true, zoho: true, vyapar: true },
  { feature: "Cloud + offline access", aczen: true, tally: false, zoho: true, vyapar: true },
  { feature: "Bank feeds (auto-reconciliation)", aczen: true, tally: false, zoho: true, vyapar: false },
  { feature: "Built-in B2B payments", aczen: true, tally: false, zoho: false, vyapar: false },
  { feature: "TDS automation + filings", aczen: true, tally: true, zoho: true, vyapar: false },
  { feature: "Multi-user with role-based access", aczen: true, tally: true, zoho: true, vyapar: false },
  { feature: "CRM + accounting in one", aczen: true, tally: false, zoho: false, vyapar: false },
  { feature: "Free starter plan", aczen: true, tally: false, zoho: false, vyapar: true },
];

const faqs = [
  {
    q: "What makes Aczen the best accounting software for Indian businesses?",
    a: "Aczen unifies GST invoicing, accounting, TDS, B2B payments, banking and CRM in one platform. Most accounting software in India handles only one or two of these, forcing teams to juggle Tally, Razorpay, a separate banking dashboard and spreadsheets. Aczen replaces all of them with a single, GST-ready system designed for Indian compliance.",
  },
  {
    q: "Is Aczen suitable for small businesses and freelancers?",
    a: "Yes. Aczen is used by SMEs, CAs, startups, freelancers and enterprises. The free starter plan covers GST invoicing, basic ledgers and up to 50 invoices a month — enough for most freelancers and proprietorships to operate fully without paying.",
  },
  {
    q: "Can Aczen handle GST returns and e-invoicing?",
    a: "Yes. Aczen generates IRN-validated e-invoices, e-way bills, and prepares GSTR-1, GSTR-3B and GSTR-9 from your transaction data. Returns can be filed directly to the GSTN portal with one click.",
  },
  {
    q: "How is Aczen different from Tally or Zoho Books?",
    a: "Tally is desktop-first and lacks built-in cloud, bank feeds and B2B payments. Zoho Books is cloud-native but doesn't include payments or banking. Aczen is fully cloud-based, includes bank feeds, B2B payments and CRM in the core product, and is priced for Indian SMEs.",
  },
  {
    q: "Is my financial data secure with Aczen?",
    a: "Aczen uses bank-grade AES-256 encryption at rest, TLS 1.3 in transit, and is hosted on ISO 27001 certified infrastructure within India. Role-based access, audit logs and 2FA are enabled for every account.",
  },
  {
    q: "How much does Aczen accounting software cost?",
    a: "Aczen has a free starter plan, paid plans starting at affordable monthly rates for growing businesses, and custom enterprise plans for larger teams. See the pricing page for full details.",
  },
];

const useCases = [
  {
    title: "Small & Medium Businesses",
    href: "/solutions/smes",
    description: "Run end-to-end accounting, GST invoicing and banking from one dashboard.",
  },
  {
    title: "Chartered Accountants",
    href: "/solutions/ca",
    description: "Manage 100+ client books with white-label invoicing and consolidated GST filings.",
  },
  {
    title: "Startups",
    href: "/solutions/startups",
    description: "Investor-ready financials, automated bookkeeping and burn-rate dashboards from day one.",
  },
  {
    title: "Freelancers",
    href: "/solutions/freelancers",
    description: "Send GST invoices, track payments and file taxes without hiring a bookkeeper.",
  },
];

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Aczen Accounting Software",
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "AccountingSoftware",
  operatingSystem: "Web, iOS, Android",
  description:
    "Aczen is GST-ready accounting software for Indian SMEs, CAs, startups and freelancers. Includes invoicing, bookkeeping, TDS, bank reconciliation and B2B payments.",
  url: `${SITE_URL}${PATH}`,
  offers: { "@type": "Offer", priceCurrency: "INR", price: "0" },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    reviewCount: "120",
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
    { "@type": "ListItem", position: 2, name: "Accounting Software", item: `${SITE_URL}${PATH}` },
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
              <span className="text-gray-900">Accounting Software</span>
            </nav>
          </div>

          <section className="container mx-auto px-4 mb-20">
            <div className="max-w-4xl">
              <span className="inline-block bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm font-medium mb-6">
                #1 Accounting Software for India
              </span>
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Best Accounting Software for Indian Businesses
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                GST-ready accounting, automated bookkeeping, TDS, bank reconciliation and B2B payments —
                all in one cloud-based platform. Built for SMEs, CAs, startups and freelancers in India.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/start"
                  className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-md font-medium transition-colors flex items-center justify-center"
                >
                  Start Free <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
                <a
                  href="https://cal.com/aczen-technologies-pvt-ltd-t7jdhz/30min"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-teal-600 text-teal-700 hover:bg-teal-50 px-8 py-3 rounded-md font-medium text-center"
                >
                  Book a Demo
                </a>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-gray-500">
                <span className="flex items-center"><Check className="w-4 h-4 text-teal-600 mr-2" /> No credit card required</span>
                <span className="flex items-center"><Check className="w-4 h-4 text-teal-600 mr-2" /> Free starter plan</span>
                <span className="flex items-center"><Check className="w-4 h-4 text-teal-600 mr-2" /> GST &amp; TDS ready</span>
              </div>
            </div>
          </section>

          <section className="container mx-auto px-4 mb-20">
            <div className="max-w-3xl mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Everything you need to run your books
              </h2>
              <p className="text-lg text-gray-600">
                Aczen's accounting software replaces five different tools with one. From the first invoice
                you send to the GSTR-9 you file, every workflow is built for Indian compliance.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f) => (
                <div key={f.title} className="bg-white p-6 rounded-lg border border-gray-200 hover:border-teal-300 hover:shadow-md transition">
                  <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
                    <f.icon className="w-6 h-6 text-teal-700" />
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
                Aczen vs Tally vs Zoho Books vs Vyapar
              </h2>
              <p className="text-lg text-gray-600">
                A side-by-side look at the most popular accounting software in India. We've compared
                features that actually matter for SMEs, CAs and growing businesses.
              </p>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-700">Feature</th>
                    <th className="px-6 py-4 text-sm font-semibold text-teal-700">Aczen</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-700">Tally</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-700">Zoho Books</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-700">Vyapar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {comparisonRows.map((r) => (
                    <tr key={r.feature} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-700">{r.feature}</td>
                      <td className="px-6 py-4">{r.aczen ? <Check className="w-5 h-5 text-teal-600" /> : <X className="w-5 h-5 text-gray-300" />}</td>
                      <td className="px-6 py-4">{r.tally ? <Check className="w-5 h-5 text-gray-600" /> : <X className="w-5 h-5 text-gray-300" />}</td>
                      <td className="px-6 py-4">{r.zoho ? <Check className="w-5 h-5 text-gray-600" /> : <X className="w-5 h-5 text-gray-300" />}</td>
                      <td className="px-6 py-4">{r.vyapar ? <Check className="w-5 h-5 text-gray-600" /> : <X className="w-5 h-5 text-gray-300" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="container mx-auto px-4 mb-20">
            <div className="max-w-3xl mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Built for every kind of Indian business
              </h2>
              <p className="text-lg text-gray-600">
                Whether you're a one-person freelance practice or a 500-person enterprise, Aczen adapts.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {useCases.map((u) => (
                <Link
                  key={u.href}
                  href={u.href}
                  className="block bg-gradient-to-br from-teal-50 to-white p-6 rounded-lg border border-teal-100 hover:border-teal-300 hover:shadow-md transition"
                >
                  <Users className="w-8 h-8 text-teal-700 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{u.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{u.description}</p>
                  <span className="text-sm text-teal-700 font-medium flex items-center">
                    Learn more <ArrowRight className="w-3 h-3 ml-1" />
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="container mx-auto px-4 mb-20">
            <div className="max-w-3xl mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Why Indian businesses choose Aczen accounting software
              </h2>
              <p className="text-lg text-gray-600">
                Most accounting software was built for the West, then localised for India. Aczen is the
                opposite — it was designed in India, for Indian compliance, from the first line of code.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <Clock className="w-8 h-8 text-teal-700 mb-3" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Save 15+ hours a month</h3>
                <p className="text-gray-600">
                  Bank feeds, OCR bill capture and auto-categorisation eliminate the manual entry that eats
                  the bookkeeper's week. What used to take a full day of reconciliation now takes minutes.
                </p>
              </div>
              <div>
                <ShieldCheck className="w-8 h-8 text-teal-700 mb-3" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Stay 100% GST compliant</h3>
                <p className="text-gray-600">
                  Every invoice, debit note and credit note is validated against GSTN rules at the moment
                  of creation. No more rejected returns or last-minute filing scrambles before the 20th.
                </p>
              </div>
              <div>
                <Banknote className="w-8 h-8 text-teal-700 mb-3" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">One platform, no integrations</h3>
                <p className="text-gray-600">
                  Most teams stitch together Tally, Razorpay, a banking app and Excel. Aczen replaces all
                  four — accounting, payments, banking and reporting are native, not bolted on.
                </p>
              </div>
              <div>
                <TrendingUp className="w-8 h-8 text-teal-700 mb-3" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-time financials</h3>
                <p className="text-gray-600">
                  See P&amp;L, cash flow and balance sheet update the second a payment lands. Make
                  decisions on today's numbers, not last month's reconciliation.
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
                Everything you wanted to know about Aczen accounting software.
              </p>
            </div>
            <div className="max-w-4xl space-y-4">
              {faqs.map((f) => (
                <details key={f.q} className="group bg-white border border-gray-200 rounded-lg p-6 hover:border-teal-300 transition">
                  <summary className="flex items-center justify-between cursor-pointer text-lg font-semibold text-gray-900">
                    {f.q}
                    <span className="ml-4 text-teal-600 group-open:rotate-45 transition-transform text-2xl leading-none">+</span>
                  </summary>
                  <p className="mt-4 text-gray-600 leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="container mx-auto px-4">
            <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl p-8 md:p-12 text-center text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Try the best accounting software for Indian businesses
              </h2>
              <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
                Free starter plan. No credit card. Set up your first GST invoice in under 5 minutes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/start"
                  className="bg-white text-teal-700 px-8 py-3 rounded-md font-medium hover:bg-gray-100 transition-colors"
                >
                  Start Free
                </Link>
                <a
                  href="https://cal.com/aczen-technologies-pvt-ltd-t7jdhz/30min"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-white text-white hover:bg-white hover:text-teal-700 px-8 py-3 rounded-md font-medium transition-colors"
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
