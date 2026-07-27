"use client";

import { CheckCircle, Shield, Lock, Check, Library, Sparkles } from "lucide-react";

const ComplianceAndSecurity = () => {
  const features = [
    {
      icon: Shield,
      title: "High Security",
      description:
        "Your data is protected with military-grade encryption and multi-factor authentication.",
      points: [
        "256-bit AES encryption",
        "Multi-factor authentication",
        "Encrypted in transit & at rest",
      ],
    },
    {
      icon: Lock,
      title: "Compliance-First Approach",
      description:
        "We follow industry best practices and trusted platforms to keep your money safe.",
      points: [
        "SOC 2 Type II controls",
        "GDPR-ready data handling",
        "Continuous compliance monitoring",
      ],
    },
    {
      icon: CheckCircle,
      title: "Secure Transactions",
      description:
        "Every transaction is monitored and protected against fraud.",
      points: [
        "Real-time fraud monitoring",
        "Maker-checker approvals",
        "24/7 anomaly detection",
      ],
    },
  ];

  const trustBadges = [
    "99.9% uptime SLA",
    "256-bit AES",
    "SOC 2 Type II",
    "GDPR-ready",
  ];

  return (
    <>
      {/* Regulation & Compliance Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border border border-border rounded overflow-hidden">
            {/* Smart Regulation Library — blue accent */}
            <div className="relative bg-white p-8 sm:p-10 flex flex-col justify-between border-t-4 border-primary">
              <div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded bg-primary text-primary-foreground mb-5">
                  <Library className="h-5 w-5" />
                </span>
                <h3 className="section-title text-2xl text-slate-900 mb-4">
                  Smart Regulation Library
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-8">
                  Access a comprehensive repository of chapter-wise regulations, master circulars, and real-time amendment updates, fully linked and queryable for effortless navigation.
                </p>
              </div>

              <div className="mt-auto border border-smebank-200 bg-smebank-50 rounded">
                <div className="flex items-start gap-4 p-5">
                  <span className="text-secondary mt-0.5 shrink-0">
                    <CheckCircle className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="font-semibold text-slate-900 leading-snug">
                      Securities and Exchange Board of India (Market Infrastructure Institutions) Regulations, 2023
                    </div>
                    <div className="text-sm text-muted-foreground mt-3 divide-y divide-smebank-200">
                      <div className="flex items-center gap-2 pb-2">
                        <span className="font-medium text-slate-900">Latest Gazette:</span>{" "}
                        <a className="text-primary font-semibold hover:underline tabular" href="#">
                          GAZ-2023-125
                        </a>
                      </div>
                      <div className="pt-2 tabular">3 Amendments · 24 applicable regulations</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI-Powered Compliance Reporting — teal accent */}
            <div className="relative bg-white p-8 sm:p-10 flex flex-col justify-between border-t-4 border-secondary">
              <div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded bg-secondary text-secondary-foreground mb-5">
                  <Sparkles className="h-5 w-5" />
                </span>
                <h3 className="section-title text-2xl text-slate-900 mb-4">
                  AI-Powered Compliance Reporting
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-8">
                  Generate audit-ready reports, compliance decks, and MIS presentations in seconds, saving weeks of manual effort.
                </p>
              </div>

              <div className="mt-auto border border-smeteal-200 bg-smeteal-50 rounded">
                <div className="p-6">
                  <div className="text-2xl font-bold text-slate-900">Compliance Actionables</div>
                  <div className="mt-3 inline-flex text-sm text-secondary-foreground bg-secondary rounded px-2.5 py-1 tabular">
                    January 6, 2025 - January 11, 2025
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section — compliance ledger */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-12 max-w-2xl">
            <span className="eyebrow">
              <Shield className="h-3.5 w-3.5" />
              Security
            </span>
            <h2 className="display text-slate-900 mt-3 mb-4">
              Security You Can Trust
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Your security is our top priority. We use advanced technology to protect your business.
            </p>
          </div>

          {/* Ruled register of security features */}
          <div className="border border-border rounded divide-y divide-border">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-[auto_1fr_1.2fr] gap-4 md:gap-8 items-start p-6"
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-9 w-9 items-center justify-center rounded shrink-0 text-white ${
                        index % 2 === 0 ? "bg-primary" : "bg-secondary"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="font-semibold text-slate-900">
                      {feature.title}
                    </span>
                  </span>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                  <div className="divide-y divide-border border-t border-border md:border-t-0 md:border-l md:pl-8 -mt-px md:mt-0">
                    {feature.points.map((point) => (
                      <div
                        key={point}
                        className="flex items-center gap-2 text-sm text-slate-900 py-2 first:pt-0 md:first:pt-2"
                      >
                        <Check className="h-3.5 w-3.5 text-secondary shrink-0" strokeWidth={3} />
                        {point}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compliance / cert index */}
          <div className="mt-8 inline-flex flex-col sm:flex-row border border-border rounded divide-y sm:divide-y-0 sm:divide-x divide-border">
            {trustBadges.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-900 tabular"
              >
                <Check className="h-3.5 w-3.5 text-secondary shrink-0" strokeWidth={3} />
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default ComplianceAndSecurity;
