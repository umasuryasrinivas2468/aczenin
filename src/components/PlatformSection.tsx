"use client";

import Link from "next/link";
import { Calculator, CreditCard, FileCheck, Building2, ArrowRight } from "lucide-react";

const cards = [
  {
    href: "/accounting-software",
    icon: Calculator,
    title: "Accounting Software",
    description:
      "GST-ready accounting, automated bookkeeping, TDS and bank reconciliation — built for Indian businesses.",
    accent: "from-teal-500 to-teal-600",
    iconBg: "bg-teal-100",
    iconColor: "text-teal-700",
    border: "hover:border-teal-300",
  },
  {
    href: "/b2b-payments",
    icon: CreditCard,
    title: "B2B Payments",
    description:
      "Pay vendors, run bulk payouts and reconcile every transaction. UPI, NEFT, RTGS — one dashboard.",
    accent: "from-purple-500 to-purple-600",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-700",
    border: "hover:border-purple-300",
  },
  {
    href: "/gst-compliance-software",
    icon: FileCheck,
    title: "GST Compliance",
    description:
      "File GSTR-1, GSTR-3B, GSTR-9 directly to GSTN. Real-time e-invoicing and GSTR-2B reconciliation.",
    accent: "from-emerald-500 to-emerald-600",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-700",
    border: "hover:border-emerald-300",
  },
  {
    href: "/business-banking",
    icon: Building2,
    title: "Business Banking",
    description:
      "Connect every Indian bank, auto-reconcile, issue corporate cards and forecast cash flow — all in one place.",
    accent: "from-indigo-500 to-indigo-600",
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-700",
    border: "hover:border-indigo-300",
  },
];

const PlatformSection = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-14">
          <span className="inline-block bg-smebank-100 text-smebank-700 px-3 py-1 rounded-full text-sm font-medium mb-4">
            One Platform for Indian Business
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
            Accounting, payments, compliance &amp; banking — unified
          </h2>
          <p className="text-lg text-gray-600">
            Aczen replaces the stack of Tally, banking portals, GST tools and payment apps with a single,
            India-first platform. Every workflow you run today, in one login.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className={`group bg-white rounded-xl p-6 border border-gray-200 ${card.border} hover:shadow-lg transition-all flex flex-col`}
              >
                <div className={`w-12 h-12 ${card.iconBg} rounded-lg flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{card.title}</h3>
                <p className="text-gray-600 text-sm mb-4 flex-grow">{card.description}</p>
                <span className="text-sm font-medium text-gray-700 group-hover:text-smebank-700 flex items-center transition-colors">
                  Learn more
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PlatformSection;
