import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const CTASection = () => {
  return (
    <section className="py-20 bg-gradient-to-r from-smebank-700 to-smebank-900 text-white overflow-hidden relative">
      {/* Background elements */}
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-smebank-500 rounded-full blur-3xl opacity-20" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-smeteal-400 rounded-full blur-3xl opacity-10" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Business Banking?
          </h2>
          <p className="text-lg md:text-xl mb-10 text-white/80 max-w-2xl mx-auto">
            Join thousands of Indian SMEs who have simplified their finances, gained valuable insights, and accelerated their growth with SMEPower.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="bg-white text-smebank-700 hover:bg-white/90 px-8 py-6 rounded-full">
              <span className="text-base">Join Waitlist</span>
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" className="border-blue-500 text-white px-8 py-6 rounded-full bg-transparent">
              <span className="text-base">Schedule a Demo</span>
            </Button>
          </div>
          
          <p className="mt-6 text-white/70 text-sm">
           
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
