"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import Link from "next/link";

type SubProcessor = {
  name: string;
  purpose: string;
  location: string;
};

const subProcessors: SubProcessor[] = [
  {
    name: "Zoho Mail",
    purpose: "Business email & communications",
    location: "India / Global",
  },
  {
    name: "Gmail (Google Workspace)",
    purpose: "Business email & communications",
    location: "Global",
  },
  {
    name: "Amazon Web Services (AWS)",
    purpose: "Cloud infrastructure & hosting",
    location: "Global (Mumbai — ap-south-1)",
  },
  {
    name: "Google Cloud Platform (GCP)",
    purpose: "Cloud infrastructure & hosting",
    location: "Global",
  },
  {
    name: "Microsoft Azure",
    purpose: "Cloud infrastructure & hosting",
    location: "Global",
  },
  {
    name: "Aczen Eco",
    purpose: "In-house communications platform",
    location: "India",
  },
  {
    name: "Aczen Eco — CRM",
    purpose: "In-house customer relationship management",
    location: "India",
  },
];

const SubProcessors = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Sub-processors — Aczen Technologies"
        description="The list of third-party sub-processors and infrastructure Aczen uses to deliver its services, including their purpose and location."
        path="/sub-processors"
      />
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Breadcrumb */}
          <div className="mb-8">
            <div className="flex items-center space-x-2 text-sm">
              <Link href="/" className="text-gray-500 hover:text-gray-700">
                Home
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900">Sub-processors</span>
            </div>
          </div>

          <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Sub-processors
            </h1>
            <p className="text-sm text-gray-500 mb-8">
              Last Updated: {new Date().toLocaleDateString()}
            </p>

            <p className="text-gray-600 mb-8 leading-relaxed">
              To deliver our services, Aczen engages a limited number of trusted
              third-party sub-processors and infrastructure providers. The table below
              lists the sub-processors we use, the purpose for which they are engaged,
              and the region in which they operate. We update this page whenever our
              sub-processors change.
            </p>

            {/* Sub-processors table */}
            <div className="overflow-x-auto rounded-2xl border border-smebank-100 shadow-[0_18px_50px_-24px_rgba(15,40,70,0.25)]">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="bg-gradient-to-r from-smebank-50 via-smeteal-50/60 to-white">
                    <th className="px-6 py-4 text-sm font-semibold text-gray-900">
                      Sub-processor
                    </th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-900">
                      Purpose / Service
                    </th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-900">
                      Location
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subProcessors.map((sp, i) => (
                    <tr
                      key={sp.name}
                      className={`border-t border-gray-100 ${
                        i % 2 ? "bg-gray-50/50" : "bg-white"
                      }`}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {sp.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{sp.purpose}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{sp.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-sm text-gray-500 mt-8 leading-relaxed">
              For questions about our sub-processors or data processing practices,
              contact us at{" "}
              <a
                href="mailto:privacy@aczen.org"
                className="text-smebank-600 hover:underline"
              >
                privacy@aczen.org
              </a>
              . See also our{" "}
              <Link href="/privacy" className="text-smebank-600 hover:underline">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link href="/gdpr" className="text-smebank-600 hover:underline">
                GDPR statement
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SubProcessors;
