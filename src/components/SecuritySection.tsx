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
      {/* Regulation & Compliance Cards */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* Smart Regulation Library */}
            <div className="rounded-2xl bg-yellow-50 p-8 shadow-md flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-4">Smart Regulation Library</h3>
                <p className="text-gray-700 mb-6">
                  Access a comprehensive repository of chapter-wise regulations, master circulars, and real-time amendment updates, fully linked and queryable for effortless navigation.
                </p>
              </div>

              <div className="mt-4 bg-white rounded-xl p-6 shadow-inner">
                <div className="flex items-start gap-4">
                  <div className="text-green-500 mt-1">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      Securities and Exchange Board of India (Market Infrastructure Institutions) Regulations, 2023
                    </div>
                    <div className="text-sm text-gray-500 mt-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Latest Gazette:</span>{" "}
                        <a className="text-indigo-600" href="#">
                          GAZ-2023-125
                        </a>
                      </div>
                      <div className="mt-2">3 Amendments · 24 applicable regulations</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI-Powered Compliance Reporting */}
            <div className="rounded-2xl bg-neutral-900 p-8 shadow-md text-white relative overflow-hidden">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-3">AI-Powered Compliance Reporting</h3>
                <p className="text-gray-200">
                  Generate audit-ready reports, compliance decks, and MIS presentations in seconds, saving weeks of manual effort.
                </p>
              </div>

              <div className="mt-auto">
                <div className="bg-gradient-to-r from-purple-400 to-pink-300 text-neutral-900 rounded-2xl p-8 shadow-lg w-full">
                  <div className="text-4xl font-bold">Compliance Actionables</div>
                  <div className="mt-4 text-sm text-neutral-800">
                    January 6, 2025 - January 11, 2025
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Security You Can Trust</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Your security is our top priority. We use advanced technology to protect your business.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="h-12 w-12 bg-indigo-50 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
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
