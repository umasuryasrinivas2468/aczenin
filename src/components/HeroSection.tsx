"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, TrendingUp, FileText, ShieldCheck } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

const Hero = () => {
  return (
    <section className="relative pt-36 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Asymmetric two-column */}
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-14 lg:gap-16 items-center">
          {/* LEFT — copy */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease }}
          >
            <span className="eyebrow">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-secondary" />
              Now live · Trusted by 10,000+ Indian SMBs
            </span>

            <h1 className="display mt-6 text-4xl md:text-5xl lg:text-[3.4rem]">
              The finance workspace for growing businesses.
            </h1>

            <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl">
              Invoicing, GST compliance, B2B payments and accounting — brought
              into one calm, intelligent platform. Bank smarter. Scale faster.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href="https://dashboard.aczen.in/signup"
                className="btn-primary px-6 py-3.5 text-base"
              >
                Start free
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ2Vf659Nu3Ni3wVnJnBvHW3wOqnF9sDiZLKmIRvip2cH_qWGZWuDoGrSibH4wEBadGDdqgUoZBJ"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost px-6 py-3.5 text-base"
              >
                Book a demo
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {["No setup fees", "45-day free trial", "Cancel anytime"].map((t) => (
                <span key={t} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-secondary" strokeWidth={3} />
                  {t}
                </span>
              ))}
            </div>
          </motion.div>

          {/* RIGHT — live statement panel */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.15 }}
          >
            <div className="border border-border bg-white rounded overflow-hidden">
              {/* toolbar strip */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="eyebrow">Cash flow overview</span>
                <span className="tabular text-xs font-semibold uppercase tracking-wider text-secondary">
                  Live
                </span>
              </div>

              {/* ruled statement rows */}
              <div className="divide-y divide-border">
                <div className="flex items-baseline justify-between px-4 py-4">
                  <span className="text-sm text-muted-foreground">Revenue · Jul</span>
                  <span className="flex items-baseline gap-3">
                    <span className="tabular text-xl font-bold text-slate-900">₹18.4L</span>
                    <span className="tabular flex items-center gap-1 text-xs font-semibold text-secondary">
                      <TrendingUp className="h-3.5 w-3.5" /> 12.4%
                    </span>
                  </span>
                </div>

                <div className="flex items-baseline justify-between px-4 py-4">
                  <span className="text-sm text-muted-foreground">Outstanding</span>
                  <span className="flex items-baseline gap-3">
                    <span className="tabular text-xl font-bold text-slate-900">₹2.1L</span>
                    <span className="tabular text-xs font-semibold text-smeorange-600">6 invoices</span>
                  </span>
                </div>

                <div className="px-4 py-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Inflow · last 7 months
                  </p>
                  <div className="mt-3 flex h-24 items-end gap-2.5">
                    {[42, 58, 49, 71, 63, 85, 96].map((h, i) => (
                      <motion.span
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ duration: 0.7, ease, delay: 0.5 + i * 0.06 }}
                        className="flex-1 rounded-none bg-secondary"
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between px-4 py-4">
                  <span className="flex items-center gap-2.5 text-sm text-slate-700">
                    <FileText className="h-4 w-4 text-primary" />
                    INV-2041 · Meridian Traders
                  </span>
                  <span className="rounded border border-border px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-secondary">
                    Paid
                  </span>
                </div>

                <div className="flex items-center gap-3 px-4 py-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded border border-border text-secondary">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <div className="leading-tight">
                    <p className="text-sm font-semibold text-slate-900">GST filed</p>
                    <p className="text-xs text-muted-foreground">auto-reconciled</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* BELOW THE FOLD — full-width ruled stat bar */}
        <div className="rule-strong mt-16 pt-px">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border border-x border-b border-border">
            <div className="px-6 py-6">
              <p className="tabular text-3xl font-extrabold text-slate-900">₹18.4L</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">Revenue · Jul</p>
            </div>
            <div className="px-6 py-6">
              <p className="tabular text-3xl font-extrabold text-slate-900">₹2.1L</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">Outstanding</p>
            </div>
            <div className="px-6 py-6">
              <p className="tabular text-3xl font-extrabold text-slate-900">10,000+</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">Indian SMBs</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
