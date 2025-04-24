import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";

const Compliance = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Breadcrumb */}
          <div className="mb-8">
            <div className="flex items-center space-x-2 text-sm">
              <Link to="/" className="text-gray-500 hover:text-gray-700">Home</Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900">Compliance</span>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Compliance Framework</h1>
            
            <div className="prose prose-lg">
              <p className="text-gray-600 mb-8">
                At Aczen, we are committed to maintaining the highest standards of compliance with all relevant laws, regulations, and industry best practices. Our compliance framework is designed to ensure transparency, security, and ethical conduct across all our operations.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">Regulatory Compliance</h2>
              <p>
                We adhere to all applicable financial regulations, including but not limited to:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Reserve Bank of India (RBI) guidelines</li>
                <li>Prevention of Money Laundering Act (PMLA)</li>
                <li>Know Your Customer (KYC) norms</li>
                <li>Information Technology Act, 2000</li>
                <li>Foreign Exchange Management Act (FEMA)</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">Data Protection & Privacy</h2>
              <p>
                Our data protection policies are designed to safeguard personal and financial information. We comply with:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Personal Data Protection Bill provisions</li>
                <li>Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011</li>
                <li>Industry-standard encryption and security protocols</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">Anti-Money Laundering (AML)</h2>
              <p>
                Our robust AML framework includes:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Customer due diligence procedures</li>
                <li>Transaction monitoring systems</li>
                <li>Suspicious activity reporting</li>
                <li>Regular staff training on AML procedures</li>
                <li>Record-keeping in accordance with regulatory requirements</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">Risk Management</h2>
              <p>
                Our comprehensive risk management approach includes:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Regular risk assessments</li>
                <li>Internal audits and controls</li>
                <li>Business continuity planning</li>
                <li>Operational risk monitoring</li>
                <li>Vendor risk management</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">Corporate Governance</h2>
              <p>
                We maintain strong corporate governance through:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Independent board oversight</li>
                <li>Clear policies and procedures</li>
                <li>Ethics code of conduct</li>
                <li>Whistleblower protection mechanisms</li>
                <li>Regular compliance reporting</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">Certifications & Audits</h2>
              <p>
                Our platform undergoes regular security and compliance audits, and we maintain the following certifications:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>ISO 27001 (Information Security Management)</li>
                <li>PCI DSS compliance for payment processing</li>
                <li>SOC 2 Type II audit compliance</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">Contact Our Compliance Team</h2>
              <p>
                For questions regarding our compliance policies or to report concerns, please contact our compliance team at: <a href="mailto:compliance@aczen.org" className="text-smebank-600 hover:underline">compliance@aczen.org</a>
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Compliance; 