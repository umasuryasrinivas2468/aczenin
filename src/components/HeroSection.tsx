"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, TrendingUp, FileText, ShieldCheck, Sparkles } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

const Hero = () => {
  return (
    <section className="relative overflow-hidden pt-36 pb-0 px-4 sm:px-6 lg:px-8">
      {/* dotted grid texture, faded at edges */}
      <div className="grid-texture pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(70%_60%_at_50%_30%,black,transparent)]" />

      <div className="max-w-7xl mx-auto">
        {/* ── Asymmetric copy block ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
          className="max-w-4xl"
        >
          <span className="eyebrow inline-flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping bg-smeteal-400 opacity-70" />
              <span className="relative inline-flex h-2 w-2 bg-smeteal-500" />
            </span>
            Now live · Trusted by 10,000+ Indian SMBs
          </span>

          <h1 className="display mt-7 text-[3rem] sm:text-7xl lg:text-[6rem] uppercase leading-[0.92] tracking-tight text-slate-900">
            Bank smarter.
            <br />
            Scale faster.
          </h1>

          <p className="mt-8 max-w-2xl text-lg md:text-xl leading-relaxed text-slate-600">
            Invoicing, GST compliance, B2B payments and accounting — brought into
            one calm, intelligent financial workspace built for growing businesses.
          </p>

          {/* CTA action row — bordered */}
          <div className="mt-9 inline-flex flex-col sm:flex-row items-stretch border-2 border-slate-900 shadow-soft-lg bg-white">
            <a
              href="https://dashboard.aczen.in/signup"
              className="btn-primary flex items-center justify-center gap-2 sm:border-r-2 border-slate-900"
            >
              Start free
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ2Vf659Nu3Ni3wVnJnBvHW3wOqnF9sDiZLKmIRvip2cH_qWGZWuDoGrSibH4wEBadGDdqgUoZBJ"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost flex items-center justify-center border-t-2 sm:border-t-0 border-slate-900"
            >
              Book a demo
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
            {["No setup fees", "45-day free trial", "Cancel anytime"].map((t) => (
              <span key={t} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-smeteal-600" strokeWidth={3} />
                {t}
              </span>
            ))}
          </div>
        </motion.div>

        {/* ── Windowed product panel ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease, delay: 0.15 }}
          className="mt-14 border-2 border-slate-900 shadow-soft-lg bg-white"
        >
          {/* title bar */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 bg-smebank-500 px-4 py-2.5">
            <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-white">
              <span className="h-2 w-2 bg-white" />
              <span className="h-2 w-2 bg-white" />
              <span className="h-2 w-2 bg-white" />
              Cash flow overview
            </span>
            <span className="inline-flex items-center gap-1.5 border-2 border-slate-900 bg-smeteal-400 px-2 py-0.5 text-xs font-bold uppercase text-slate-900">
              <span className="h-1.5 w-1.5 bg-slate-900 animate-pulse" />
              Live
            </span>
          </div>

          <div className="grid md:grid-cols-3 divide-y-2 md:divide-y-0 md:divide-x-2 divide-slate-900">
            {/* stat cell 1 */}
            <div className="bg-smebank-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Revenue · Jul</p>
              <p className="mt-2 text-3xl font-black tracking-tight text-slate-900 tabular-nums">
                ₹18.4L
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs font-bold text-smeteal-600">
                <TrendingUp className="h-3.5 w-3.5" /> 12.4%
              </p>
            </div>
            {/* stat cell 2 */}
            <div className="bg-smeteal-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Outstanding</p>
              <p className="mt-2 text-3xl font-black tracking-tight text-slate-900 tabular-nums">
                ₹2.1L
              </p>
              <p className="mt-1 text-xs font-bold text-smeorange-600">
                6 invoices
              </p>
            </div>
            {/* chart cell */}
            <div className="bg-white p-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                Inflow · last 7 months
              </p>
              <div className="flex h-20 items-end gap-2">
                {[42, 58, 49, 71, 63, 85, 96].map((h, i) => (
                  <motion.span
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ duration: 0.7, ease, delay: 0.5 + i * 0.06 }}
                    className="flex-1 border-2 border-slate-900 bg-smebank-500"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* invoice row */}
          <div className="flex items-center justify-between border-t-2 border-slate-900 px-5 py-3">
            <span className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
              <FileText className="h-4 w-4 text-smebank-500" />
              INV-2041 · Meridian Traders
            </span>
            <span className="border-2 border-slate-900 bg-smeteal-400 px-2 py-0.5 text-xs font-bold uppercase text-slate-900">
              Paid
            </span>
          </div>

          {/* fact strip */}
          <div className="grid grid-cols-2 border-t-2 border-slate-900 divide-x-2 divide-slate-900">
            <div className="flex items-center gap-2.5 p-4">
              <span className="flex h-8 w-8 items-center justify-center border-2 border-slate-900 bg-smeteal-400 text-slate-900">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div className="leading-tight">
                <p className="text-xs font-bold uppercase text-slate-900">GST filed</p>
                <p className="text-[11px] text-slate-500">auto-reconciled</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-4">
              <span className="flex h-8 w-8 items-center justify-center border-2 border-slate-900 bg-smeorange-400 text-slate-900">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="leading-tight">
                <p className="text-xs font-bold uppercase text-slate-900">AI reconciled</p>
                <p className="text-[11px] text-slate-500">398 payments</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Full-width bordered stat strip ── */}
        <div className="mt-14 border-2 border-slate-900 shadow-soft grid grid-cols-3 divide-x-2 divide-slate-900 bg-white">
          {[
            { n: "10,000+", l: "Indian SMBs" },
            { n: "45-day", l: "free trial" },
            { n: "398", l: "payments reconciled" },
          ].map((s) => (
            <div key={s.l} className="p-6 text-center">
              <p className="display text-3xl sm:text-5xl font-black text-slate-900 tabular-nums">
                {s.n}
              </p>
              <p className="mt-1 text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-500">
                {s.l}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
