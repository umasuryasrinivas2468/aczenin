
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { HelpCircle, Video, FileText, MessagesSquare } from "lucide-react";

const Help = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="py-20">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-center mb-12">Help Center</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Video Tutorials */}
            <div className="p-6 rounded-xl border hover:shadow-lg transition-shadow">
              <Video className="w-12 h-12 text-smebank-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Video Tutorials</h3>
              <p className="text-gray-600 mb-4">Learn how to use SMEPower through our detailed video guides</p>
              <a href="#" className="text-smebank-600 hover:text-smebank-700 font-medium">Watch Now →</a>
            </div>

            {/* Documentation */}
            <div className="p-6 rounded-xl border hover:shadow-lg transition-shadow">
              <FileText className="w-12 h-12 text-smebank-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Documentation</h3>
              <p className="text-gray-600 mb-4">Detailed guides and documentation for all SMEPower features</p>
              <a href="#" className="text-smebank-600 hover:text-smebank-700 font-medium">Read More →</a>
            </div>

            {/* Support */}
            <div className="p-6 rounded-xl border hover:shadow-lg transition-shadow">
              <MessagesSquare className="w-12 h-12 text-smebank-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Live Support</h3>
              <p className="text-gray-600 mb-4">Get help from our support team 24/7</p>
              <a href="#contact" className="text-smebank-600 hover:text-smebank-700 font-medium">Contact Us →</a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Help;
