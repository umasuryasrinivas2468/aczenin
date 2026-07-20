"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import Link from "next/link";

const CookiePolicy = () => {
  const openCookiePreferences = () => {
    window.dispatchEvent(new Event("open-cookie-consent"));
  };

  return (
    <div className="min-h-screen">
      <SEO
        title="Cookie Policy — Aczen Technologies"
        description="Learn how Aczen uses cookies and similar technologies, the categories of cookies we set, and how you can manage your preferences."
        path="/cookies"
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
              <span className="text-gray-900">Cookie Policy</span>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Cookie Policy
            </h1>
            <p className="text-sm text-gray-500 mb-8">
              Last Updated: {new Date().toLocaleDateString()}
            </p>

            <div className="prose prose-lg">
              <p className="text-gray-600 mb-8">
                This Cookie Policy explains what cookies are, how Aczen ("we", "us")
                uses them on our website and applications, and the choices you have.
                By continuing to use our site you agree to our use of cookies as
                described here, unless you disable them.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">What are cookies?</h2>
              <p>
                Cookies are small text files stored on your device when you visit a
                website. They help the site remember your actions and preferences
                (such as login, language and display settings) over a period of time,
                and help us understand how the site is used so we can improve it.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">
                Types of cookies we use
              </h2>
              <ul className="list-disc pl-6 mb-4">
                <li>
                  <strong>Strictly necessary cookies</strong> — required for the site
                  to function (e.g. security, session management and remembering your
                  cookie consent choice). These cannot be switched off.
                </li>
                <li>
                  <strong>Preference cookies</strong> — remember choices you make, such
                  as language or region, to provide a more personalised experience.
                </li>
                <li>
                  <strong>Analytics cookies</strong> — help us understand how visitors
                  interact with the site by collecting information anonymously, so we
                  can measure and improve performance.
                </li>
                <li>
                  <strong>Marketing cookies</strong> — used to deliver content and ads
                  more relevant to you and to measure the effectiveness of campaigns.
                </li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">
                How we use cookies
              </h2>
              <p>We use cookies to:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Keep you signed in and secure your session</li>
                <li>Remember your preferences and settings</li>
                <li>Understand how our services are used and improve them</li>
                <li>Measure the performance of our content and campaigns</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">
                Managing your preferences
              </h2>
              <p>
                You can change or withdraw your consent at any time using the button
                below. You can also control cookies through your browser settings —
                most browsers let you block or delete cookies, though doing so may
                affect how parts of the site work.
              </p>
              <p className="mt-4">
                <button
                  type="button"
                  onClick={openCookiePreferences}
                  className="inline-flex items-center rounded-lg bg-gradient-to-r from-smebank-700 to-smeteal-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:shadow-soft"
                >
                  Manage cookie preferences
                </button>
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">
                Third-party cookies
              </h2>
              <p>
                Some cookies may be set by third-party services that appear on our
                pages (for example analytics providers). We do not control the setting
                of these cookies, so please check the third parties' own policies for
                more information.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">
                Changes to this policy
              </h2>
              <p>
                We may update this Cookie Policy from time to time. Any changes will be
                posted on this page with a revised "Last Updated" date.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">Contact us</h2>
              <p>
                If you have questions about our use of cookies, contact us at{" "}
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
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CookiePolicy;
