import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const Hero = () => {
  const [phone, setPhone] = useState("");

  const handleGetStarted = () => {
    if (phone.trim() === "") {
      alert("Please enter your phone number.");
      return;
    }
    alert(`Thank you! We’ll contact you soon at +91 ${phone}`);
  };

  return (
    <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-blue-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative">
        <div className="text-center max-w-4xl mx-auto">
          <Badge className="mb-6 bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Now Live • Trusted by 10,000+ SMBs
          </Badge>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            One Accounting Platform to{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Manage Invoices, Expenses & Taxes
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Automate your invoicing, streamline GST compliance, and manage financial workflows 
            with our intelligent fintech platform designed for growing businesses.
          </p>

          {/* Phone Input Section with India Flag */}
          <div className="flex justify-center mb-12">
            <div className="flex items-center bg-white shadow-sm border border-gray-200 rounded-full overflow-hidden w-full max-w-md">
              
              {/* Country code section */}
              <div className="flex items-center gap-2 pl-5 pr-3 border-r border-gray-200 bg-gray-50">
                <span className="text-lg">🇮🇳</span>
                <span className="text-gray-700 font-medium">+91</span>
              </div>

              {/* Phone input */}
              <input
                type="tel"
                placeholder="Enter your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 px-4 py-3 text-gray-700 focus:outline-none text-base"
              />

              {/* Button */}
              <Button
                onClick={handleGetStarted}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-full"
              >
                Get Started
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              No setup fees
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              45-day free trial
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Cancel anytime
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
