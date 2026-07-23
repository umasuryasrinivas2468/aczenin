import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const CTASection = () => {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="relative border border-border rounded bg-white overflow-hidden">
          <div className="rule-strong" />
          <div className="grid-texture absolute inset-0 opacity-40 pointer-events-none" aria-hidden="true" />

          <div className="relative px-6 py-14 sm:px-12 sm:py-20">
            <h2 className="display text-slate-900 max-w-3xl">
              Ready to Transform Your Business Banking?
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
              Join thousands of Indian SMEs who have simplified their finances, gained valuable insights, and accelerated their growth with SMEPower.
            </p>

            <div className="rule my-10" />

            <div className="flex flex-col sm:flex-row gap-4">
              <Button className="btn-primary rounded">
                <span>Join Waitlist</span>
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="ghost" className="btn-ghost rounded">
                <span>Schedule a Demo</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
