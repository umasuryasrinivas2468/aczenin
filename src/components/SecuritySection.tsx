"use client";

import { CheckCircle, Shield, Lock, Check } from "lucide-react";
import { motion } from "framer-motion";

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
      <section className="py-24 bg-smebank-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* Smart Regulation Library */}
            <div className="border-2 border-slate-900 bg-white p-10 shadow-soft-lg flex flex-col justify-between">
              <div>
                <h3 className="section-title mb-4">
                  Smart Regulation Library
                </h3>
                <p className="text-slate-900 leading-relaxed mb-8">
                  Access a comprehensive repository of chapter-wise regulations, master circulars, and real-time amendment updates, fully linked and queryable for effortless navigation.
                </p>
              </div>

              <div className="mt-auto border-2 border-slate-900 bg-smeteal-50 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-slate-900 bg-smeteal-400 text-slate-900">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 leading-snug">
                      Securities and Exchange Board of India (Market Infrastructure Institutions) Regulations, 2023
                    </div>
                    <div className="text-sm text-slate-900 mt-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Latest Gazette:</span>{" "}
                        <a className="underline" href="#">
                          GAZ-2023-125
                        </a>
                      </div>
                      <div>3 Amendments · 24 applicable regulations</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI-Powered Compliance Reporting */}
            <div className="border-2 border-slate-900 bg-smebank-500 p-10 shadow-soft text-white flex flex-col justify-between">
              <div>
                <h3 className="section-title text-white mb-4">
                  AI-Powered Compliance Reporting
                </h3>
                <p className="text-white leading-relaxed mb-10">
                  Generate audit-ready reports, compliance decks, and MIS presentations in seconds, saving weeks of manual effort.
                </p>
              </div>

              <div className="mt-auto">
                <div className="border-2 border-slate-900 bg-white text-slate-900 p-8 w-full shadow-soft">
                  <div className="display text-4xl">Compliance Actionables</div>
                  <div className="mt-3 text-sm text-slate-900">
                    January 6, 2025 - January 11, 2025
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="mb-14"
          >
            <span className="eyebrow inline-flex items-center gap-2 mb-4">
              <Shield className="h-3.5 w-3.5" />
              Security
            </span>
            <h2 className="display mb-4">
              Security You Can Trust
            </h2>
            <p className="text-slate-900 max-w-2xl text-lg">
              Your security is our top priority. We use advanced technology to protect your business.
            </p>
          </motion.div>

          {/* Bold split: checklist rows (left) + cert badges (right) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left: stacked bordered checklist rows */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 28 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.45, delay: index * 0.08 }}
                    className="border-2 border-slate-900 bg-white shadow-soft"
                  >
                    <div className="flex items-stretch">
                      {/* Square accent icon box */}
                      <div className="flex w-16 shrink-0 items-center justify-center border-r-2 border-slate-900 bg-smeteal-400 sm:w-20">
                        <Icon className="h-8 w-8 text-slate-900" />
                      </div>

                      <div className="flex-1 p-6">
                        <h3 className="text-xl font-semibold mb-2 text-slate-900">
                          {feature.title}
                        </h3>
                        <p className="text-slate-900 leading-relaxed">
                          {feature.description}
                        </p>

                        <div className="mt-5 pt-5 border-t-2 border-slate-900 flex flex-wrap gap-x-6 gap-y-2.5">
                          {feature.points.map((point) => (
                            <div
                              key={point}
                              className="flex items-center gap-2 text-sm text-slate-900"
                            >
                              <span className="flex h-5 w-5 items-center justify-center border-2 border-slate-900 bg-smeteal-50 text-slate-900">
                                <Check className="h-3 w-3" strokeWidth={3} />
                              </span>
                              {point}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Right: stacked cert / compliance badge blocks */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex flex-col gap-6"
            >
              {trustBadges.map((badge) => (
                <div
                  key={badge}
                  className="flex items-center gap-4 border-2 border-slate-900 bg-smebank-50 p-6 shadow-soft"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-slate-900 bg-smebank-500 text-white">
                    <Check className="h-5 w-5" strokeWidth={3} />
                  </span>
                  <span className="text-base font-semibold text-slate-900">
                    {badge}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
};

export default ComplianceAndSecurity;
