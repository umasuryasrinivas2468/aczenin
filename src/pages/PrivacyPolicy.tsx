import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";

const PrivacyPolicy = () => {
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
              <span className="text-gray-900">Privacy Policy</span>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
            <p className="text-sm text-gray-500 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>
            
            <div className="prose prose-lg">
              <p className="text-gray-600 mb-8">
                At Aczen, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">Information We Collect</h2>
              <p>
                We collect information that you provide directly to us when you:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Register for an account</li>
                <li>Apply for a loan or financial product</li>
                <li>Fill out a form</li>
                <li>Use our chat or messaging features</li>
                <li>Subscribe to our newsletter</li>
                <li>Contact our customer support</li>
              </ul>
              <p>
                The types of information we may collect include:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Personal identifiers (name, email address, phone number, address)</li>
                <li>Business information (company name, business address, GST number)</li>
                <li>Financial information (bank account details, income statements, business turnover)</li>
                <li>Identity verification documents (PAN card, Aadhaar, business registration certificates)</li>
                <li>Login credentials</li>
                <li>Device information and usage data</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">How We Use Your Information</h2>
              <p>
                We may use the information we collect from you for various purposes, including to:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Provide, maintain, and improve our services</li>
                <li>Process and fulfill your loan applications and financial requests</li>
                <li>Verify your identity and eligibility for our services</li>
                <li>Communicate with you about your account and our services</li>
                <li>Send you technical notices, updates, security alerts, and support messages</li>
                <li>Respond to your comments, questions, and customer service requests</li>
                <li>Monitor and analyze trends, usage, and activities in connection with our services</li>
                <li>Detect, investigate, and prevent fraudulent transactions and other illegal activities</li>
                <li>Comply with legal and regulatory requirements</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">Information Sharing and Disclosure</h2>
              <p>
                We may share your information with the following parties:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Financial institution partners for loan processing and disbursement</li>
                <li>Third-party service providers who provide services such as payment processing, data analysis, IT services, customer service, and marketing assistance</li>
                <li>Professional advisors such as lawyers, bankers, auditors, and insurers</li>
                <li>Government bodies, regulators, and law enforcement agencies, as required by law</li>
                <li>Business partners with whom we jointly offer products or services</li>
              </ul>
              <p>
                We may also share your information in the following circumstances:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>To comply with legal obligations</li>
                <li>To protect and defend our rights and property</li>
                <li>To prevent or investigate possible wrongdoing in connection with the services</li>
                <li>In the event of a merger, sale, or acquisition, where your information may be transferred to the new entity</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">Data Security</h2>
              <p>
                We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">Your Data Rights</h2>
              <p>
                Depending on your location, you may have the following rights regarding your data:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Right to access - You have the right to request copies of your personal data.</li>
                <li>Right to rectification - You have the right to request that we correct any information you believe is inaccurate or complete information you believe is incomplete.</li>
                <li>Right to erasure - You have the right to request that we erase your personal data, under certain conditions.</li>
                <li>Right to restrict processing - You have the right to request that we restrict the processing of your personal data, under certain conditions.</li>
                <li>Right to data portability - You have the right to request that we transfer the data we have collected to another organization, or directly to you, under certain conditions.</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">Children's Privacy</h2>
              <p>
                Our services are not directed to children under 18 years of age, and we do not knowingly collect personal information from children under 18. If we learn that we have collected personal information from a child under 18 without verification of parental consent, we will promptly take steps to remove that information.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">Changes to This Privacy Policy</h2>
              <p>
                We may update our privacy policy from time to time. We will notify you of any changes by posting the new privacy policy on this page and updating the "Last Updated" date at the top. You are advised to review this privacy policy periodically for any changes.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">Contact Us</h2>
              <p>
                If you have any questions about this privacy policy or our data practices, please contact us at: <a href="mailto:privacy@aczen.org" className="text-smebank-600 hover:underline">privacy@aczen.org</a>
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy; 