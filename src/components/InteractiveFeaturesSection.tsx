import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    id: "eway-bills",
    label: "E-way Bills",
    title: "Generate E-way Bills Instantly",
    subtitle: "E-way Bills",
    description: "Create and manage E-way bills directly from your invoices. Automatic distance calculation and validity tracking ensure smooth logistics.",
    gradient: "from-blue-50 to-indigo-50",
    textGradient: "from-blue-600 to-indigo-600"
  },
  {
    id: "e-invoices",
    label: "E-invoices",
    title: "Seamless E-invoicing",
    subtitle: "E-invoices",
    description: "Generate IRN and QR codes with a single click. Directly integrated with the IRP portal for real-time validation and cancellation.",
    gradient: "from-purple-50 to-pink-50",
    textGradient: "from-purple-600 to-pink-600"
  },
  {
    id: "custom-columns",
    label: "Custom Columns & Headers",
    title: "Personalise invoices your way",
    subtitle: "Custom Columns & Headers",
    description: "Your business isn't one-size-fits-all. Swipe lets you customise columns, rename headers, and add fields that fit your workflow — so every invoice feels tailor-made.",
    gradient: "from-blue-100 via-indigo-50 to-purple-100",
    textGradient: "from-blue-600 to-purple-600"
  },
  {
    id: "gstr-json",
    label: "GSTR JSON",
    title: "One-Click GSTR JSON Export",
    subtitle: "GSTR JSON",
    description: "Export your data in GSTR-compliant JSON format. Ready to upload to the GST portal without any manual adjustments.",
    gradient: "from-green-50 to-emerald-50",
    textGradient: "from-green-600 to-emerald-600"
  },
  {
    id: "advanced-gst",
    label: "Advanced GST",
    title: "Handle Complex GST Scenarios",
    subtitle: "Advanced GST",
    description: "Manage reverse charge, export invoices, SEZ supplies, and multi-rate items with ease. Stay compliant with the latest GST rules.",
    gradient: "from-orange-50 to-amber-50",
    textGradient: "from-orange-600 to-amber-600"
  },
  {
    id: "reports",
    label: "Reports",
    title: "Insightful Business Reports",
    subtitle: "Reports",
    description: "Get real-time insights with over 50+ reports including P&L, Balance Sheet, Stock Summary, and Party-wise statements.",
    gradient: "from-teal-50 to-cyan-50",
    textGradient: "from-teal-600 to-cyan-600"
  },
  {
    id: "bulk-uploads",
    label: "Bulk Uploads",
    title: "Bulk Data Management",
    subtitle: "Bulk Uploads",
    description: "Upload thousands of items, parties, and invoices in seconds using our Excel templates. Save time on manual data entry.",
    gradient: "from-gray-50 to-slate-50",
    textGradient: "from-gray-600 to-slate-600"
  },
  {
    id: "export-invoices",
    label: "Export Invoices",
    title: "Export to Multiple Formats",
    subtitle: "Export Invoices",
    description: "Share invoices via WhatsApp, Email, or export as PDF, Excel, or CSV. Keep your stakeholders informed in their preferred format.",
    gradient: "from-red-50 to-rose-50",
    textGradient: "from-red-600 to-rose-600"
  },
  {
    id: "tally-sync",
    label: "Tally Sync",
    title: "Seamless Tally Integration",
    subtitle: "Tally Sync",
    description: "Sync your data with Tally Prime automatically. Keep your accounting books updated without double entry.",
    gradient: "from-yellow-50 to-lime-50",
    textGradient: "from-yellow-600 to-lime-600"
  },
  {
    id: "swipe-ai",
    label: "Uploads with Swipe AI",
    title: "AI-Powered Data Entry",
    subtitle: "Uploads with Swipe AI",
    description: "Scan invoices and receipts to automatically extract data. Let AI handle the boring typing work for you.",
    gradient: "from-violet-50 to-fuchsia-50",
    textGradient: "from-violet-600 to-fuchsia-600"
  },
  {
    id: "batches-expiry",
    label: "Manage Batches & Expiry",
    title: "Inventory Batch Tracking",
    subtitle: "Manage Batches & Expiry",
    description: "Track item batches, manufacturing dates, and expiry dates. Perfect for pharma, FMCG, and retail businesses.",
    gradient: "from-emerald-50 to-green-50",
    textGradient: "from-emerald-600 to-green-600"
  }
];

const InteractiveFeaturesSection = () => {
  const [activeFeature, setActiveFeature] = useState(features[2]); // Default to Custom Columns & Headers

  return (
    <section className="py-20 bg-white overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
            Mind-blowing convenience <span className="text-4xl">😑</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Swipe is built to make your life easier. We're always doing things for you to experience ultimate convenience.
          </p>
        </div>

        {/* Feature Navigation Pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-12 max-w-5xl mx-auto">
          {features.map((feature) => (
            <button
              key={feature.id}
              onClick={() => setActiveFeature(feature)}
              className={cn(
                "px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border",
                activeFeature.id === feature.id
                  ? "bg-gray-900 text-white border-gray-900 shadow-md"
                  : "bg-gray-100 text-gray-700 border-transparent hover:bg-gray-200"
              )}
            >
              {feature.label}
            </button>
          ))}
        </div>

        {/* Feature Content Area */}
        <div className={cn(
          "rounded-3xl p-8 md:p-16 transition-all duration-500 ease-in-out bg-gradient-to-br",
          activeFeature.gradient
        )}>
          <div className="max-w-4xl mx-auto text-center md:text-left">
            <div className="inline-block mb-4">
              <span className="text-sm font-bold tracking-wider uppercase text-gray-900">
                {activeFeature.subtitle}
              </span>
            </div>
            
            <h3 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              {activeFeature.title}
            </h3>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-10 leading-relaxed max-w-3xl">
              {activeFeature.description}
            </p>
            
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Try Now <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InteractiveFeaturesSection;
