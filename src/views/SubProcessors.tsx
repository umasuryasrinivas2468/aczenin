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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="mb-8">
            <div className="flex items-center space-x-2 text-sm">
              <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                Home
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-foreground">Sub-processors</span>
            </div>
          </div>

          <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Sub-processors
            </h1>
            <p className="text-sm text-muted-foreground mb-8">
              Last Updated: {new Date().toLocaleDateString()}
            </p>

            <p className="text-muted-foreground mb-8 leading-relaxed max-w-3xl">
              To deliver our services, Aczen engages a limited number of trusted
              third-party sub-processors and infrastructure providers. The table below
              lists the sub-processors we use, the purpose for which they are engaged,
              and the region in which they operate. We update this page whenever our
              sub-processors change.
            </p>

            {/* Sub-processors table */}
            <div className="overflow-x-auto rounded-2xl border border-smebank-100 bg-white shadow-soft-lg">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="bg-gradient-to-r from-smebank-50 via-smeteal-50/60 to-white">
                    <th className="px-6 py-4 text-sm font-semibold text-foreground">
                      Sub-processor
                    </th>
                    <th className="px-6 py-4 text-sm font-semibold text-foreground">
                      Purpose / Service
                    </th>
                    <th className="px-6 py-4 text-sm font-semibold text-foreground">
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
                      <td className="px-6 py-4 text-sm font-medium text-foreground">
                        {sp.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{sp.purpose}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{sp.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-sm text-muted-foreground mt-8 leading-relaxed max-w-3xl">
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
