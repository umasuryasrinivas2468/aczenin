"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import Link from "next/link";

const GDPR = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="GDPR Compliance — Aczen Technologies"
        description="Aczen's GDPR statement explains the rights of data subjects, our lawful bases for processing, and how to exercise your data protection rights."
        path="/gdpr"
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
              <span className="text-foreground">GDPR</span>
            </div>
          </div>

          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              GDPR Compliance
            </h1>
            <p className="text-sm text-muted-foreground mb-8">
              Last Updated: {new Date().toLocaleDateString()}
            </p>

            <div className="prose prose-lg max-w-none text-muted-foreground leading-relaxed">
              <p className="text-muted-foreground mb-8">
                Aczen is committed to protecting the personal data of individuals in
                line with the EU General Data Protection Regulation (GDPR) and other
                applicable data protection laws. This statement summarises how we
                handle personal data and the rights available to data subjects.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">
                Lawful bases for processing
              </h2>
              <p>We process personal data only where we have a lawful basis, including:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Performance of a contract with you</li>
                <li>Compliance with a legal or regulatory obligation</li>
                <li>Your consent, which you may withdraw at any time</li>
                <li>Our legitimate interests, balanced against your rights</li>
              </ul>

              <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">Your rights</h2>
              <p>
                If you are located in the European Economic Area (EEA), you have the
                following rights regarding your personal data:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>
                  <strong>Right to be informed</strong> about how your data is used
                </li>
                <li>
                  <strong>Right of access</strong> to the personal data we hold about you
                </li>
                <li>
                  <strong>Right to rectification</strong> of inaccurate or incomplete data
                </li>
                <li>
                  <strong>Right to erasure</strong> ("right to be forgotten"), where applicable
                </li>
                <li>
                  <strong>Right to restrict</strong> processing under certain conditions
                </li>
                <li>
                  <strong>Right to data portability</strong> in a structured, machine-readable format
                </li>
                <li>
                  <strong>Right to object</strong> to processing based on legitimate interests
                </li>
                <li>
                  <strong>Rights related to automated decision-making</strong> and profiling
                </li>
              </ul>

              <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">
                International data transfers
              </h2>
              <p>
                Where personal data is transferred outside the EEA, we put in place
                appropriate safeguards — such as Standard Contractual Clauses — to
                ensure your data continues to be protected.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">Data retention</h2>
              <p>
                We retain personal data only for as long as necessary to fulfil the
                purposes for which it was collected, including to satisfy legal,
                accounting or regulatory requirements.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">
                Exercising your rights
              </h2>
              <p>
                To exercise any of these rights, or to raise a concern about how we
                handle your data, please contact our Data Protection team at{" "}
                <a
                  href="mailto:privacy@aczen.org"
                  className="text-smebank-600 hover:underline"
                >
                  privacy@aczen.org
                </a>
                . We will respond within the timeframes required by law. You also have
                the right to lodge a complaint with your local supervisory authority.
              </p>

              <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">Related policies</h2>
              <p>
                For more detail, see our{" "}
                <Link href="/privacy" className="text-smebank-600 hover:underline">
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link href="/cookies" className="text-smebank-600 hover:underline">
                  Cookie Policy
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default GDPR;
