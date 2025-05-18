
import { Shield, Lock, CheckCircle } from "lucide-react";

const SecuritySection = () => {
  const features = [
    {
      icon: Shield,
      title: "High Security",
      description: "Your data is protected with military-grade encryption and multi-factor authentication"
    },
    {
      icon: Lock,
      title: "Compliance-First Approach",
      description: "We follow industry best practices and work with RBI-authorized platforms to keep your money safe."
    },
    {
      icon: CheckCircle,
      title: "Secure Transactions",
      description: "Every transaction is monitored and protected against fraud"
    }
  ];

  return (
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
              <div key={index} className="bg-white p-6 rounded-xl shadow-sm">
                <div className="h-12 w-12 bg-smebank-50 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-smebank-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default SecuritySection;
