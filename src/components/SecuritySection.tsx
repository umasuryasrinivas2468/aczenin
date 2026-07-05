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
      <section className="py-20 bg-gradient-to-b from-purple-50 via-indigo-50/60 to-white overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-stretch">
            {/* Smart Regulation Library */}
            <div className="rounded-3xl bg-white p-10 shadow-[0_18px_50px_-24px_rgba(88,60,180,0.35)] flex flex-col justify-between border border-purple-100/70">
              <div>
                <h3 className="text-3xl font-extrabold text-gray-900 mb-4">
                  Smart Regulation Library
                </h3>
                <p className="text-gray-700 leading-relaxed mb-8">
                  Access a comprehensive repository of chapter-wise regulations, master circulars, and real-time amendment updates, fully linked and queryable for effortless navigation.
                </p>
              </div>

              <div className="mt-auto bg-white rounded-2xl p-6 shadow-inner border border-gray-100">
                <div className="flex items-start gap-4">
                  <div className="text-green-500 mt-1">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 leading-snug">
                      Securities and Exchange Board of India (Market Infrastructure Institutions) Regulations, 2023
                    </div>
                    <div className="text-sm text-gray-500 mt-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Latest Gazette:</span>{" "}
                        <a className="text-indigo-600 hover:underline" href="#">
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
            <div className="rounded-3xl bg-gradient-to-br from-purple-700 via-purple-900 to-indigo-900 p-10 shadow-xl text-white relative overflow-hidden border border-purple-800">
              <div>
                <h3 className="text-3xl font-extrabold mb-4">
                  AI-Powered Compliance Reporting
                </h3>
                <p className="text-gray-300 leading-relaxed mb-10">
                  Generate audit-ready reports, compliance decks, and MIS presentations in seconds, saving weeks of manual effort.
                </p>
              </div>

              <div className="mt-auto">
                <div className="bg-gradient-to-r from-purple-300 via-indigo-200 to-purple-100 text-neutral-900 rounded-3xl p-8 shadow-lg w-full">
                  <div className="text-4xl font-extrabold">Compliance Actionables</div>
                  <div className="mt-3 text-sm text-neutral-700">
                    January 6, 2025 - January 11, 2025
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-20 bg-gradient-to-b from-purple-50 via-indigo-50/60 to-white overflow-hidden">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-purple-100 text-purple-700 px-3 py-1 text-xs font-semibold tracking-[0.16em] uppercase mb-4">
              <Shield className="h-3.5 w-3.5" />
              Security
            </span>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
              Security You Can Trust
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Your security is our top priority. We use advanced technology to protect your business.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  className="group bg-white p-8 rounded-3xl border border-purple-100/70 shadow-[0_18px_50px_-24px_rgba(88,60,180,0.35)] hover:shadow-[0_26px_60px_-20px_rgba(88,60,180,0.45)] hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                    <Icon className="h-7 w-7 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>

                  <div className="mt-6 pt-6 border-t border-gray-100 space-y-2.5">
                    {feature.points.map((point) => (
                      <div
                        key={point}
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                        {point}
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Trust badge strip */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-12 flex flex-wrap justify-center gap-3"
          >
            {trustBadges.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center gap-2 rounded-full bg-white border border-purple-100 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm"
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </span>
                {badge}
              </span>
            ))}
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default ComplianceAndSecurity;
