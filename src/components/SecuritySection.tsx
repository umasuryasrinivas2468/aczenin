import { CheckCircle, Shield, Lock } from "lucide-react";

const ComplianceAndSecurity = () => {
  const features = [
    {
      icon: Shield,
      title: "High Security",
      description:
        "Your data is protected with military-grade encryption and multi-factor authentication.",
    },
    {
      icon: Lock,
      title: "Compliance-First Approach",
      description:
        "We follow industry best practices and work with RBI-authorized platforms to keep your money safe.",
    },
    {
      icon: CheckCircle,
      title: "Secure Transactions",
      description:
        "Every transaction is monitored and protected against fraud.",
    },
  ];

  return (
    <>
      {/* Regulation & Compliance Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-stretch">
            {/* Smart Regulation Library */}
            <div className="rounded-3xl bg-yellow-50 p-10 shadow-lg flex flex-col justify-between border border-yellow-100">
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
            <div className="rounded-3xl bg-neutral-900 p-10 shadow-xl text-white relative overflow-hidden border border-neutral-800">
              <div>
                <h3 className="text-3xl font-extrabold mb-4">
                  AI-Powered Compliance Reporting
                </h3>
                <p className="text-gray-300 leading-relaxed mb-10">
                  Generate audit-ready reports, compliance decks, and MIS presentations in seconds, saving weeks of manual effort.
                </p>
              </div>

              <div className="mt-auto">
                <div className="bg-gradient-to-r from-purple-400 via-pink-300 to-yellow-200 text-neutral-900 rounded-3xl p-8 shadow-lg w-full">
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
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
              Security You Can Trust
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Your security is our top priority. We use advanced technology to protect your business.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10 max-w-6xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 transition-shadow duration-300"
                >
                  <div className="h-14 w-14 bg-indigo-50 rounded-xl flex items-center justify-center mb-5">
                    <Icon className="h-7 w-7 text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
};

export default ComplianceAndSecurity;
