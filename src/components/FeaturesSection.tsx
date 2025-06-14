
import { 
  Calendar, 
  LineChart, 
  CreditCard, 
  FileText, 
  Headphones, 
  ShieldCheck 
} from "lucide-react";

const FeatureCard = ({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string; 
}) => {
  return (
    <div className="feature-card">
      <div className="mb-4 inline-block p-3 bg-gradient-to-br from-smebank-50 to-smebank-100 rounded-lg">
        <Icon className="h-6 w-6 text-smebank-600" />
      </div>
      <h3 className="text-xl font-semibold mb-2 text-gray-800">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
};

const FeaturesSection = () => {
  const features = [
    {
      icon: FileText,
      title: "Smart Invoicing",
      description:
        "Create and manage GST-compliant invoices with automated payment reminders and tracking.",
    },
    {
      icon: CreditCard,
      title: "GST Reprorting",
      description:
        "Comprehensive GST reporting with real-time tracking, automated filing, and compliance monitoring.",
    },
    {
      icon: LineChart,
      title: "Cash Flow Insights",
      description:
        "Real-time analytics and forecasting to help you make informed financial decisions.",
    },
    {
      icon: Calendar,
      title: "Payment Scheduling",
      description:
        "Schedule vendor payments and payroll in advance with recurring payment options.",
    },
    {
      icon: ShieldCheck,
      title: "Secure Transactions",
      description:
        "Bank-grade security with multi-factor authentication protecting your financial data.",
    },
    {
      icon: Headphones,
      title: "24/7 Expert Support",
      description:
        "Dedicated relationship manager and round-the-clock customer service.",
    },
  ];

  return (
    <section id="features" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="section-title">Powerful Features for Your Business</h2>
          <p className="section-subtitle max-w-2xl mx-auto">
            Everything you need to manage your business finances efficiently in one place
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
        
        <div className="mt-16 text-center">
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
