"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, TrendingUp, FileText, ShieldCheck } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

const Hero = () => {
  return (
    <section className="relative pt-36 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* soft ambient wash — restrained, not loud */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[520px] rounded-full bg-smebank-100/40 blur-[120px]" />
        <div className="absolute top-40 right-0 w-[420px] h-[420px] rounded-full bg-smeteal-100/40 blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-14 lg:gap-16 items-center">
          {/* Copy */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 shadow-soft">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-smeteal-400 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-smeteal-500" />
              </span>
              Now live · Trusted by 10,000+ Indian SMBs
            </span>

            <h1 className="mt-6 text-4xl md:text-5xl lg:text-[3.4rem] font-extrabold tracking-tight text-slate-900 leading-[1.05]">
              The finance workspace for growing businesses.
            </h1>

            <p className="mt-6 text-lg md:text-xl text-slate-500 leading-relaxed max-w-xl">
              Invoicing, GST compliance, B2B payments and accounting — brought
              into one calm, intelligent platform. Bank smarter. Scale faster.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href="https://dashboard.aczen.in/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-smebank-600 px-6 py-3.5 text-base font-semibold text-white shadow-soft transition-all duration-300 hover:bg-smebank-700 hover:-translate-y-0.5 hover:shadow-soft-lg"
              >
                Start free
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ2Vf659Nu3Ni3wVnJnBvHW3wOqnF9sDiZLKmIRvip2cH_qWGZWuDoGrSibH4wEBadGDdqgUoZBJ"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-black/[0.08] bg-white px-6 py-3.5 text-base font-semibold text-slate-700 transition-all duration-300 hover:border-smebank-200 hover:text-smebank-700"
              >
                Book a demo
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
              {["No setup fees", "45-day free trial", "Cancel anytime"].map((t) => (
                <span key={t} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-smeteal-600" strokeWidth={3} />
                  {t}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Product card — soft, gentle depth */}
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease, delay: 0.15 }}
            className="relative"
          >
            <div className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-soft-lg">
              <div className="flex items-center justify-between px-1 pb-4">
                <span className="text-sm font-semibold text-slate-800">
                  Cash flow overview
                </span>
                <span className="rounded-md bg-smeteal-50 px-2 py-0.5 text-xs font-semibold text-smeteal-700">
                  Live
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 border border-black/[0.05] p-4">
                  <p className="text-xs font-medium text-slate-400">Revenue · Jul</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                    ₹18.4L
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-smeteal-600">
                    <TrendingUp className="h-3.5 w-3.5" /> 12.4%
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-black/[0.05] p-4">
                  <p className="text-xs font-medium text-slate-400">Outstanding</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                    ₹2.1L
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-smeorange-600">
                    6 invoices
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-2xl bg-slate-50 border border-black/[0.05] p-4">
                <p className="mb-3 text-xs font-medium text-slate-400">
                  Inflow · last 7 months
                </p>
                <div className="flex h-24 items-end gap-2.5">
                  {[42, 58, 49, 71, 63, 85, 96].map((h, i) => (
                    <motion.span
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.7, ease, delay: 0.5 + i * 0.06 }}
                      className="flex-1 rounded-md bg-gradient-to-t from-smebank-500 to-smeteal-400"
                    />
                  ))}
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 border border-black/[0.05] px-4 py-3">
                  <span className="flex items-center gap-2.5 text-sm text-slate-600">
                    <FileText className="h-4 w-4 text-smebank-500" />
                    INV-2041 · Meridian Traders
                  </span>
                  <span className="rounded-md bg-smeteal-50 px-2 py-0.5 text-xs font-semibold text-smeteal-700">
                    Paid
                  </span>
                </div>
              </div>
            </div>

            {/* floating accent chip — one, subtle */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease, delay: 0.9 }}
              className="absolute -bottom-5 -left-4 hidden sm:flex items-center gap-2.5 rounded-2xl border border-black/[0.06] bg-white px-4 py-3 shadow-soft-lg"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-smeteal-50 text-smeteal-600">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div className="leading-tight">
                <p className="text-xs font-semibold text-slate-800">GST filed</p>
                <p className="text-[11px] text-slate-400">auto-reconciled</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
