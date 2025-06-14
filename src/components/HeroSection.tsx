
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play } from "lucide-react";

const Hero = () => {
  const handleDownloadClick = () => {
    window.open('https://www.dropbox.com/scl/fi/zfbuvfjmkc3fgk50u8zuc/AczenBilz.exe?rlkey=kfxa4px1g4fp8lddo9kpymgig&st=63rr0fgv&dl=0', '_blank');
  };

  const handleRequestDemoClick = () => {
    window.open('https://aczen.zohobookings.in/#/279356000000041052', '_blank');
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
            Simplify Invoicing & GST with{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              One Powerful Platform
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Automate your invoicing, streamline GST compliance, and manage financial workflows 
            with our intelligent fintech platform designed for growing businesses.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold group"
              onClick={handleDownloadClick}
            >
              Download for Windows
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="px-8 py-4 text-lg font-semibold border-2 hover:bg-gray-50 group"
              onClick={handleRequestDemoClick}
            >
              <Play className="mr-2 h-5 w-5" />
              Request Demo
            </Button>
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