import { ArrowRight } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative">
          {/* Offset brutalist accent block */}
          <div className="hidden md:block absolute -top-4 -left-4 w-24 h-24 bg-smeteal-400 border-2 border-slate-900" />
          <div className="hidden md:block absolute -bottom-4 -right-4 w-24 h-24 bg-smeorange-400 border-2 border-slate-900" />

          {/* Full-bleed color block panel */}
          <div className="relative border-2 border-slate-900 shadow-soft-lg bg-smebank-500 text-white overflow-hidden">
            <div className="absolute inset-0 grid-texture opacity-20 pointer-events-none" />

            <div className="relative px-6 py-16 sm:px-12 sm:py-20 lg:px-20">
              <h2 className="display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 max-w-3xl">
                Ready to transform your business finances?
              </h2>
              <p className="text-lg md:text-xl mb-10 text-white/80 max-w-2xl leading-relaxed">
                Join thousands of Indian businesses who simplified their finances, gained
                real-time insights, and accelerated growth with Aczen.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="https://dashboard.aczen.in/signup"
                  className="inline-flex items-center justify-center gap-2 border-2 border-slate-900 bg-white px-8 py-4 text-base font-semibold text-slate-900 shadow-soft transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
                >
                  Start free
                  <ArrowRight className="h-5 w-5" />
                </a>
                <a
                  href="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ2Vf659Nu3Ni3wVnJnBvHW3wOqnF9sDiZLKmIRvip2cH_qWGZWuDoGrSibH4wEBadGDdqgUoZBJ"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center border-2 border-slate-900 bg-smeorange-400 px-8 py-4 text-base font-semibold text-slate-900 shadow-soft transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
                >
                  Book a demo
                </a>
              </div>

              <p className="mt-8 text-white/70 text-sm">
                No setup fees · 45-day free trial · Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
