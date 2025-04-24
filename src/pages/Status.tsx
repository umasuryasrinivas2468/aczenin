
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CheckCircle2, AlertCircle } from "lucide-react";

const Status = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="py-20">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-center mb-12">System Status</h1>
          
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="text-green-500 w-6 h-6" />
                <h2 className="text-xl font-semibold">All Systems Operational</h2>
              </div>
              <p className="text-gray-600 ml-9">Updated 2 minutes ago</p>
            </div>

            <div className="grid gap-4">
              {/* Service Status Cards */}
              {[
                { name: "Payment Processing", status: "operational" },
                { name: "Account Services", status: "operational" },
                { name: "Mobile App", status: "operational" },
                { name: "API Services", status: "operational" },
                { name: "Customer Support", status: "operational" }
              ].map((service) => (
                <div key={service.name} className="p-4 bg-white rounded-lg border flex justify-between items-center">
                  <span className="font-medium">{service.name}</span>
                  <span className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-5 h-5" />
                    Operational
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Status;
