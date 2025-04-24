import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";

const TermsOfService = () => {
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
              <span className="text-gray-900">Terms of Service</span>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Terms of Service</h1>
            <p className="text-sm text-gray-500 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>
            
            <div className="prose prose-lg">
              <p className="text-gray-600 mb-8">
                Please read these Terms of Service ("Terms", "Terms of Service") carefully before using the Aczen website and services operated by Aczen Technologies Private Limited.
              </p>
              
              <p className="text-gray-600 mb-8">
                By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of the terms, you do not have permission to access the Service.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">1. Accounts</h2>
              <p>
                When you create an account with us, you guarantee that the information you provide is accurate, complete, and current at all times. Inaccurate, incomplete, or obsolete information may result in the immediate termination of your account on the Service.
              </p>
              <p className="mt-4">
                You are responsible for maintaining the confidentiality of your account and password, including but not limited to restricting access to your computer and/or account. You agree to accept responsibility for any and all activities or actions that occur under your account and/or password.
              </p>
              <p className="mt-4">
                You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">2. Services and Fees</h2>
              <p>
                The Aczen platform provides financial services, including but not limited to SME lending, invoice discounting, and other financial products. The use of these services may be subject to fees, which will be clearly communicated prior to any transaction.
              </p>
              <p className="mt-4">
                All fees are non-refundable except as required by law or as explicitly stated in these Terms. We reserve the right to change our fee structure at any time. Changes to the fee structure will be posted online and will be effective immediately.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">3. Intellectual Property</h2>
              <p>
                The Service and its original content, features, and functionality are and will remain the exclusive property of Aczen Technologies Private Limited and its licensors. The Service is protected by copyright, trademark, and other laws of both India and foreign countries.
              </p>
              <p className="mt-4">
                Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of Aczen Technologies Private Limited.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">4. User Content</h2>
              <p>
                Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material. You are responsible for the content that you post on or through the Service, including its legality, reliability, and appropriateness.
              </p>
              <p className="mt-4">
                By posting content on or through the Service, you represent and warrant that:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>The content is yours (you own it) and/or you have the right to use it and the right to grant us the rights and license as provided in these Terms.</li>
                <li>The posting of your content on or through the Service does not violate the privacy rights, publicity rights, copyrights, contract rights or any other rights of any person or entity.</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">5. Prohibited Uses</h2>
              <p>
                You agree not to use the Service:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>In any way that violates any applicable national, federal, state, local, or international law or regulation.</li>
                <li>For the purpose of exploiting, harming, or attempting to exploit or harm minors in any way.</li>
                <li>To transmit, or procure the sending of, any advertising or promotional material, including any "junk mail", "chain letter", "spam", or any other similar solicitation.</li>
                <li>To impersonate or attempt to impersonate the Company, a Company employee, another user, or any other person or entity.</li>
                <li>To engage in any other conduct that restricts or inhibits anyone's use or enjoyment of the Service, or which, as determined by us, may harm the Company or users of the Service or expose them to liability.</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">6. Termination</h2>
              <p>
                We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
              </p>
              <p className="mt-4">
                If you wish to terminate your account, you may simply discontinue using the Service or contact us to request account deletion.
              </p>
              <p className="mt-4">
                All provisions of the Terms which by their nature should survive termination shall survive termination, including, without limitation, ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">7. Limitation of Liability</h2>
              <p>
                In no event shall Aczen Technologies Private Limited, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Your access to or use of or inability to access or use the Service;</li>
                <li>Any conduct or content of any third party on the Service;</li>
                <li>Any content obtained from the Service; and</li>
                <li>Unauthorized access, use or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence) or any other legal theory, whether or not we have been informed of the possibility of such damage.</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">8. Disclaimer</h2>
              <p>
                Your use of the Service is at your sole risk. The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The Service is provided without warranties of any kind, whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement, or course of performance.
              </p>
              <p className="mt-4">
                Aczen Technologies Private Limited, its subsidiaries, affiliates, and its licensors do not warrant that:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>The Service will function uninterrupted, secure or available at any particular time or location;</li>
                <li>Any errors or defects will be corrected;</li>
                <li>The Service is free of viruses or other harmful components; or</li>
                <li>The results of using the Service will meet your requirements.</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">9. Governing Law</h2>
              <p>
                These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions.
              </p>
              <p className="mt-4">
                Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights. If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining provisions of these Terms will remain in effect.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">10. Changes to Terms</h2>
              <p>
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
              </p>
              <p className="mt-4">
                By continuing to access or use our Service after any revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, you are no longer authorized to use the Service.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">11. Contact Us</h2>
              <p>
                If you have any questions about these Terms, please contact us at: <a href="mailto:legal@aczen.org" className="text-smebank-600 hover:underline">legal@aczen.org</a>
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfService; 