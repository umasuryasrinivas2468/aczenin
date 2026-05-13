import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Check,
  X,
  Building2,
  CreditCard,
  TrendingUp,
  Wallet,
  ShieldCheck,
  Layers,
  Users,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

const SITE_URL = "https://aczen.in";
const PATH = "/business-banking";

export const metadata: Metadata = {
  title: "Business Banking Software for Indian SMEs — Aczen",
  description:
    "Aczen connects every business bank account into one dashboard. Live balances, multi-bank reconciliation, payouts, expense cards and cash-flow forecasting for Indian SMEs, startups and enterprises.",
  keywords:
    "business banking software India, banking software for SMEs, multi-bank dashboard, current account software, cash flow management software, corporate banking platform India, business expense cards, RBI compliant banking platform",
  alternates: { canonical: PATH },
  openGraph: {
    title: "Business Banking Software for Indian SMEs — Aczen",
    description:
      "Connect every business bank account into one dashboard. Live balances, payouts, expense cards and cash-flow forecasting.",
    url: PATH,
    type: "website",
  },
};

const features = [
  {
    icon: Building2,
    title: "Multi-Bank Dashboard",
    description:
      "Connect every business bank — ICICI, HDFC, SBI, Axis, Kotak, Yes Bank and 100+ others — and see live balances, transactions and statements in one place.",
  },
  {
    icon: RefreshCw,
    title: "Auto-Reconciliation",
    description:
      "Bank feeds match transactions to invoices, bills and ledgers in real time. Mismatches and missing entries are flagged immediately — no more month-end surprises.",
  },
  {
    icon: CreditCard,
    title: "Corporate Expense Cards",
    description:
      "Issue virtual and physical cards to employees with custom limits, merchant categories and approval workflows. Every spend is auto-tagged to a project or cost centre.",
  },
  {
    icon: Wallet,
    title: "Bulk Payouts",
    description:
      "Run salary, vendor and contractor payouts from any connected bank with one upload. UPI, NEFT, RTGS and IMPS — Aczen routes through the cheapest channel automatically.",
  },
  {
    icon: TrendingUp,
    title: "Cash Flow Forecasting",
    description:
      "13-week rolling cash forecast based on actual receivables, payables and recurring transactions. See runway, working-capital gaps and seasonal dips before they hit.",
  },
  {
    icon: Layers,
    title: "Multi-Entity Support",
    description:
      "Run banking, accounting and reporting across multiple entities, GSTINs and currencies — with consolidated dashboards for the parent company.",
  },
];

const comparisonRows = [
  { feature: "Multi-bank live dashboard", aczen: true, razorpayX: true, open: true, traditional: false },
  { feature: "Auto-reconciliation to ledgers", aczen: true, razorpayX: false, open: true, traditional: false },
  { feature: "Built-in accounting & GST", aczen: true, razorpayX: false, open: false, traditional: false },
  { feature: "Corporate expense cards", aczen: true, razorpayX: true, open: true, traditional: false },
  { feature: "Bulk payouts (UPI/NEFT/RTGS)", aczen: true, razorpayX: true, open: true, traditional: true },
  { feature: "Cash flow forecasting", aczen: true, razorpayX: false, open: false, traditional: false },
  { feature: "Multi-entity consolidation", aczen: true, razorpayX: false, open: false, traditional: false },
  { feature: "RBI / ISO 27001 compliant", aczen: true, razorpayX: true, open: true, traditional: true },
];

const faqs = [
  {
    q: "What is business banking software?",
    a: "Business banking software is a platform that connects all of a company's bank accounts and gives finance teams a unified view of balances, transactions, payouts and reconciliation. Aczen extends this with native accounting, GST, expense cards and cash-flow forecasting — replacing the typical stack of a banking dashboard, Tally and spreadsheets.",
  },
  {
    q: "Is Aczen a bank?",
    a: "No. Aczen is not a bank — it's an RBI-aware platform that connects to your existing business bank accounts via secure bank feeds and partner APIs. Your money stays with your bank; Aczen makes it usable.",
  },
  {
    q: "Which Indian banks does Aczen support?",
    a: "Aczen supports 100+ Indian banks including ICICI, HDFC, SBI, Axis, Kotak, Yes Bank, IndusInd, RBL, IDFC FIRST and most public-sector banks. New connections are added every month.",
  },
  {
    q: "Can I issue corporate cards through Aczen?",
    a: "Yes. Aczen supports virtual and physical corporate cards in partnership with regulated card-issuing banks. Set per-card limits, restrict merchant categories, approve transactions in real time and auto-post every spend to the right ledger.",
  },
  {
    q: "How does cash flow forecasting work?",
    a: "Aczen builds a 13-week rolling forecast from your bank balances, open invoices, scheduled payouts and recurring patterns. Adjust assumptions in scenarios — best case, base case, worst case — to see runway and working-capital gaps weeks ahead.",
  },
  {
    q: "Is Aczen secure for handling our banking data?",
    a: "Aczen uses bank-grade AES-256 encryption at rest, TLS 1.3 in transit, is hosted on ISO 27001 certified infrastructure within India, and follows RBI guidelines for data localisation. Read-only bank feeds mean Aczen can never move money without explicit approval workflows.",
  },
];

const useCases = [
  {
    title: "SMEs & MSMEs",
    href: "/solutions/smes",
    description: "One dashboard for every bank, every payout and every reconciliation.",
  },
  {
    title: "Startups",
    href: "/solutions/startups",
    description: "Investor-grade cash-flow forecasts, runway tracking and burn analysis from day one.",
  },
  {
    title: "Enterprises",
    href: "/solutions/enterprises",
    description: "Multi-entity, multi-currency banking with consolidated treasury reporting.",
  },
  {
    title: "Chartered Accountants",
    href: "/solutions/ca",
    description: "Reconcile client books across 100+ bank accounts without ever logging into a banking portal.",
  },
];

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Aczen Business Banking",
  applicationCategory: "FinanceApplication",
  applicationSubCategory: "BankingSoftware",
  operatingSystem: "Web, iOS, Android",
  description:
    "Aczen Business Banking connects every Indian business bank account into one dashboard with live balances, auto-reconciliation, corporate cards, bulk payouts and cash-flow forecasting.",
  url: `${SITE_URL}${PATH}`,
  offers: { "@type": "Offer", priceCurrency: "INR", price: "0" },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    reviewCount: "76",
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
    { "@type": "ListItem", position: 2, name: "Business Banking", item: `${SITE_URL}${PATH}` },
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
              <span className="text-gray-900">Business Banking</span>
            </nav>
          </div>

          <section className="container mx-auto px-4 mb-20">
            <div className="max-w-4xl">
              <span className="inline-block bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium mb-6">
                Banking Software for India
              </span>
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Business Banking Software for Indian SMEs
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Connect every bank account, reconcile transactions in real time, run payouts, issue
                corporate cards and forecast cash flow — all from one dashboard. Built for SMEs,
                startups, CAs and enterprises.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/start"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-md font-medium transition-colors flex items-center justify-center"
                >
                  Start Free <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
                <a
                  href="https://cal.com/aczen-technologies-pvt-ltd-t7jdhz/30min"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-indigo-600 text-indigo-700 hover:bg-indigo-50 px-8 py-3 rounded-md font-medium text-center"
                >
                  Book a Demo
                </a>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-gray-500">
                <span className="flex items-center"><Check className="w-4 h-4 text-indigo-600 mr-2" /> 100+ Indian banks supported</span>
                <span className="flex items-center"><Check className="w-4 h-4 text-indigo-600 mr-2" /> RBI &amp; ISO 27001 compliant</span>
                <span className="flex items-center"><Check className="w-4 h-4 text-indigo-600 mr-2" /> Real-time reconciliation</span>
              </div>
            </div>
          </section>

          <section className="container mx-auto px-4 mb-20">
            <div className="max-w-3xl mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Every banking workflow, in one platform
              </h2>
              <p className="text-lg text-gray-600">
                Indian SMEs typically run 3–7 bank accounts and switch between separate portals every day.
                Aczen replaces all of them with a single dashboard that's tied directly to your books.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f) => (
                <div key={f.title} className="bg-white p-6 rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                    <f.icon className="w-6 h-6 text-indigo-700" />
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
                Aczen vs RazorpayX vs Open vs traditional banking
              </h2>
              <p className="text-lg text-gray-600">
                The most-used business banking platforms in India compared on the workflows that matter
                for finance teams.
              </p>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-700">Feature</th>
                    <th className="px-6 py-4 text-sm font-semibold text-indigo-700">Aczen</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-700">RazorpayX</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-700">Open</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-700">Traditional bank portal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {comparisonRows.map((r) => (
                    <tr key={r.feature} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-700">{r.feature}</td>
                      <td className="px-6 py-4">{r.aczen ? <Check className="w-5 h-5 text-indigo-600" /> : <X className="w-5 h-5 text-gray-300" />}</td>
                      <td className="px-6 py-4">{r.razorpayX ? <Check className="w-5 h-5 text-gray-600" /> : <X className="w-5 h-5 text-gray-300" />}</td>
                      <td className="px-6 py-4">{r.open ? <Check className="w-5 h-5 text-gray-600" /> : <X className="w-5 h-5 text-gray-300" />}</td>
                      <td className="px-6 py-4">{r.traditional ? <Check className="w-5 h-5 text-gray-600" /> : <X className="w-5 h-5 text-gray-300" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="container mx-auto px-4 mb-20">
            <div className="max-w-3xl mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Built for finance teams of every size
              </h2>
              <p className="text-lg text-gray-600">
                One dashboard — whether you run a single current account or treasury across 50 entities.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {useCases.map((u) => (
                <Link
                  key={u.href}
                  href={u.href}
                  className="block bg-gradient-to-br from-indigo-50 to-white p-6 rounded-lg border border-indigo-100 hover:border-indigo-300 hover:shadow-md transition"
                >
                  <Users className="w-8 h-8 text-indigo-700 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{u.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{u.description}</p>
                  <span className="text-sm text-indigo-700 font-medium flex items-center">
                    Learn more <ArrowRight className="w-3 h-3 ml-1" />
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="container mx-auto px-4 mb-20">
            <div className="max-w-3xl mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Why finance teams pick Aczen for banking
              </h2>
              <p className="text-lg text-gray-600">
                Most "business banking platforms" are payment products with a dashboard. Aczen connects
                directly to your existing banks and ties every transaction back to your books, GST and
                vendor records — so banking and accounting are one workflow, not two.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <RefreshCw className="w-8 h-8 text-indigo-700 mb-3" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Reconciliation in minutes</h3>
                <p className="text-gray-600">
                  Bank feeds + auto-matching mean a month-end reconciliation that used to take a junior
                  accountant 2 days now takes 20 minutes. Mismatches surface immediately, not at audit.
                </p>
              </div>
              <div>
                <TrendingUp className="w-8 h-8 text-indigo-700 mb-3" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Forecast that's actually accurate</h3>
                <p className="text-gray-600">
                  Because Aczen has every invoice, bill and bank transaction, the cash forecast is built
                  on actual data — not founder guesses. See runway and working-capital risk weeks ahead.
                </p>
              </div>
              <div>
                <ShieldCheck className="w-8 h-8 text-indigo-700 mb-3" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Bank-grade security</h3>
                <p className="text-gray-600">
                  AES-256 at rest, TLS 1.3 in transit, ISO 27001 certified infrastructure within India.
                  Maker-checker workflows on every payout. Read-only bank feeds — your money stays at your bank.
                </p>
              </div>
              <div>
                <Layers className="w-8 h-8 text-indigo-700 mb-3" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">One source of truth</h3>
                <p className="text-gray-600">
                  Banking, accounting, GST, payments and CRM live in the same database. No CSV exports,
                  no integration breakage, no reconciliation between systems that should agree.
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
                Everything you wanted to know about Aczen business banking software.
              </p>
            </div>
            <div className="max-w-4xl space-y-4">
              {faqs.map((f) => (
                <details key={f.q} className="group bg-white border border-gray-200 rounded-lg p-6 hover:border-indigo-300 transition">
                  <summary className="flex items-center justify-between cursor-pointer text-lg font-semibold text-gray-900">
                    {f.q}
                    <span className="ml-4 text-indigo-600 group-open:rotate-45 transition-transform text-2xl leading-none">+</span>
                  </summary>
                  <p className="mt-4 text-gray-600 leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="container mx-auto px-4">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl p-8 md:p-12 text-center text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Run your business banking on Aczen
              </h2>
              <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
                Free starter plan. Connect your first bank in under 5 minutes. See live balances, payouts
                and reconciliation in one dashboard.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/start"
                  className="bg-white text-indigo-700 px-8 py-3 rounded-md font-medium hover:bg-gray-100 transition-colors"
                >
                  Start Free
                </Link>
                <a
                  href="https://cal.com/aczen-technologies-pvt-ltd-t7jdhz/30min"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-white text-white hover:bg-white hover:text-indigo-700 px-8 py-3 rounded-md font-medium transition-colors"
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
