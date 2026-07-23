"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useInView, AnimatePresence, type Variants } from "framer-motion";
import { Check, ShieldCheck, Sparkles } from "lucide-react";

/* ---------- shared stagger variants (drives the "streaming result" feel) ---------- */

const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const barItem: Variants = {
  hidden: { scaleY: 0, opacity: 0 },
  show: { scaleY: 1, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } },
};

/* A mock shell that stagger-reveals its children once scrolled into view. */
const MockShell = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <motion.div
    variants={container}
    initial="hidden"
    whileInView="show"
    viewport={{ once: true, margin: "-60px" }}
    className={className}
  >
    {children}
  </motion.div>
);

/* ---------- tiny presentational helpers ---------- */

const Pill = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center rounded-full bg-smebank-50 text-smebank-700 text-[11px] font-medium px-2.5 py-1">
    {children}
  </span>
);

const Badge = ({
  children,
  tone = "purple",
}: {
  children: ReactNode;
  tone?: "purple" | "green" | "amber";
}) => {
  const tones = {
    purple: "bg-smebank-100 text-smebank-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
};

const CheckRow = ({ label }: { label: string }) => (
  <div className="flex items-center gap-2 text-sm text-gray-700">
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
      <Check className="h-3 w-3" strokeWidth={3} />
    </span>
    {label}
  </div>
);

/* ---------- per-feature mini mockups ---------- */

const AGENT_PROMPT = "Reconcile September invoices";
const AGENT_RESULTS = [
  { label: "Fetched 412 invoices" },
  { label: "Matched 398 payments" },
  { label: "Flagging 14 mismatches…", pending: true },
];

const AgentMock = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  const [typed, setTyped] = useState("");
  const [doneTyping, setDoneTyping] = useState(false);
  const [visibleResults, setVisibleResults] = useState(0);

  // Typewriter: reveal the prompt one character at a time once in view.
  useEffect(() => {
    if (!inView) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(AGENT_PROMPT.slice(0, i));
      if (i >= AGENT_PROMPT.length) {
        clearInterval(id);
        setDoneTyping(true);
      }
    }, 55);
    return () => clearInterval(id);
  }, [inView]);

  // Stagger the results in after the prompt finishes typing.
  useEffect(() => {
    if (!doneTyping) return;
    const id = setInterval(() => {
      setVisibleResults((n) => {
        if (n >= AGENT_RESULTS.length) {
          clearInterval(id);
          return n;
        }
        return n + 1;
      });
    }, 550);
    return () => clearInterval(id);
  }, [doneTyping]);

  return (
    <div
      ref={ref}
      className="rounded-2xl bg-gray-50/80 border border-gray-100 p-4 space-y-3"
    >
      <div className="rounded-xl bg-smebank-600 text-white p-3">
        <p className="text-[11px] uppercase tracking-wide text-smebank-200 mb-1">
          Prompt
        </p>
        <p className="text-sm font-medium min-h-[1.25rem]">
          “{typed}
          {!doneTyping && (
            <span className="inline-block w-0.5 h-4 -mb-0.5 ml-0.5 bg-white animate-pulse" />
          )}
          {doneTyping && "”"}
        </p>
      </div>
      <div className="rounded-xl bg-white border border-gray-100 p-3 space-y-2.5 min-h-[104px]">
        {!doneTyping && <p className="text-xs text-gray-400 italic">Running…</p>}
        <AnimatePresence>
          {AGENT_RESULTS.slice(0, visibleResults).map((r) => (
            <motion.div
              key={r.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {r.pending ? (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-smebank-100 text-smebank-600">
                    <Sparkles className="h-3 w-3" />
                  </span>
                  {r.label}
                </div>
              ) : (
                <CheckRow label={r.label} />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

const InvoiceMock = () => (
  <MockShell className="rounded-2xl bg-gray-50/80 border border-gray-100 p-4 space-y-3">
    <motion.div variants={item} className="rounded-xl bg-white border border-gray-100 p-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-900 text-sm">INV-2026-0421</p>
          <p className="text-xs text-gray-400">Acme Corp · ₹2,84,000</p>
        </div>
        <Badge tone="amber">OPEN</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {["UPI", "CARD", "NET", "VA", "LINK"].map((p) => (
          <Pill key={p}>{p}</Pill>
        ))}
      </div>
    </motion.div>
    <motion.div
      variants={item}
      className="rounded-xl bg-white border border-gray-100 p-3 flex items-center justify-between"
    >
      <div>
        <p className="font-semibold text-gray-900 text-sm">UTR · 2026824331</p>
        <p className="text-xs text-gray-400">auto-matched · 8s</p>
      </div>
      <Badge tone="green">PAID</Badge>
    </motion.div>
  </MockShell>
);

const GstMock = () => (
  <MockShell className="rounded-2xl bg-gray-50/80 border border-gray-100 p-4 space-y-3">
    <motion.div variants={item} className="flex gap-1.5">
      {[
        { k: "GSTR-1", active: true },
        { k: "GSTR-3B", active: false },
        { k: "GSTR-9", active: false },
      ].map((t) => (
        <span
          key={t.k}
          className={`flex-1 text-center text-xs font-medium rounded-lg py-2 ${
            t.active
              ? "bg-smebank-600 text-white"
              : "bg-white text-gray-500 border border-gray-100"
          }`}
        >
          {t.k}
        </span>
      ))}
    </motion.div>
    <div className="rounded-xl bg-white border border-gray-100 p-3 space-y-2.5">
      <motion.div variants={item}>
        <CheckRow label="GSTR-1 filed to GSTN" />
      </motion.div>
      <motion.div variants={item}>
        <CheckRow label="e-Invoice generated" />
      </motion.div>
      <motion.div
        variants={item}
        className="flex items-center justify-between text-sm text-gray-700"
      >
        <span className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-smebank-100 text-smebank-600 text-[10px] font-bold">
            %
          </span>
          GSTR-2B reconciled
        </span>
        <Badge tone="green">98%</Badge>
      </motion.div>
    </div>
  </MockShell>
);

const CashFlowMock = () => {
  const bars = [40, 62, 34, 78, 52, 88, 46, 70];
  return (
    <MockShell className="rounded-2xl bg-gray-50/80 border border-gray-100 p-4">
      <motion.div variants={item} className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-gray-900">Cash flow · 8w</span>
        <Badge tone="green">▲ 18%</Badge>
      </motion.div>
      <div className="flex items-end gap-2 h-24">
        {bars.map((h, i) => (
          <motion.div
            key={i}
            variants={barItem}
            style={{ height: `${h}%`, transformOrigin: "bottom" }}
            className={`flex-1 rounded-t-md ${i % 2 ? "bg-smebank-200" : "bg-smebank-500"}`}
          />
        ))}
      </div>
      <motion.div
        variants={item}
        className="mt-3 flex items-center gap-4 text-xs text-gray-500"
      >
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-smebank-500" /> Inflow
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-smebank-200" /> Outflow
        </span>
      </motion.div>
    </MockShell>
  );
};

const ScheduleMock = () => (
  <MockShell className="rounded-2xl bg-gray-50/80 border border-gray-100 p-4 space-y-3">
    <motion.div variants={item} className="rounded-xl bg-white border border-gray-100 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-900 text-sm">Vendor batch · Sep</p>
          <p className="text-xs text-gray-400">1,240 · ₹2.4 Cr</p>
        </div>
        <Badge>BATCH</Badge>
      </div>
      <div className="mt-3 flex overflow-hidden rounded-lg border border-gray-100">
        {["NEFT", "RTGS", "IMPS"].map((m, i) => (
          <span
            key={m}
            className={`flex-1 text-center text-xs font-semibold py-2 ${
              i === 0 ? "bg-smebank-600 text-white" : "bg-white text-gray-500"
            }`}
          >
            {m}
          </span>
        ))}
      </div>
    </motion.div>
    <motion.div
      variants={item}
      className="flex items-center justify-between text-[11px] font-semibold"
    >
      <span className="text-gray-400">MAKER</span>
      <span className="text-gray-300">›</span>
      <span className="text-gray-400">CHECKER</span>
      <span className="text-gray-300">›</span>
      <span className="flex items-center gap-1 text-emerald-600">
        APPROVER <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    </motion.div>
  </MockShell>
);

const SecureMock = () => (
  <MockShell className="rounded-2xl bg-gray-50/80 border border-gray-100 p-4 space-y-3">
    <motion.div
      variants={item}
      className="rounded-xl bg-white border border-gray-100 p-3 flex items-center gap-3"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-smebank-100 text-smebank-600">
        <ShieldCheck className="h-5 w-5" />
      </span>
      <div>
        <p className="font-semibold text-gray-900 text-sm">Bank-grade security</p>
        <p className="text-xs text-gray-400">Multi-factor · encrypted</p>
      </div>
    </motion.div>
    <div className="rounded-xl bg-white border border-gray-100 p-3 space-y-2.5">
      <motion.div variants={item}>
        <CheckRow label="Two-factor authentication" />
      </motion.div>
      <motion.div variants={item}>
        <CheckRow label="256-bit AES encryption" />
      </motion.div>
      <motion.div variants={item}>
        <CheckRow label="SOC 2 Type II compliant" />
      </motion.div>
    </div>
  </MockShell>
);

/* ---------- feature data (Agentic AI first) ---------- */

type Feature = {
  no: string;
  eyebrow: string;
  title: string;
  description: string;
  mock: ReactNode;
};

const features: Feature[] = [
  {
    no: "01",
    eyebrow: "AGENTIC AI",
    title: "Agentic AI mode.",
    description:
      "Autonomous, prompt-driven execution that runs your finance workflows end to end — while you stay in control.",
    mock: <AgentMock />,
  },
  {
    no: "02",
    eyebrow: "INVOICE",
    title: "Smart GST invoicing.",
    description:
      "Create GST-compliant invoices with automated reminders and tracking — mapped back to customers, ledgers and payments.",
    mock: <InvoiceMock />,
  },
  {
    no: "03",
    eyebrow: "COMPLIANCE",
    title: "GST reporting, filed.",
    description:
      "Real-time tracking, automated GSTR-1 / 3B / 9 filing and GSTR-2B reconciliation — compliance monitored end to end.",
    mock: <GstMock />,
  },
  {
    no: "04",
    eyebrow: "INSIGHTS",
    title: "Cash flow insights.",
    description:
      "Real-time analytics and forecasting across inflow and outflow to help you make informed financial decisions.",
    mock: <CashFlowMock />,
  },
  {
    no: "05",
    eyebrow: "PAYOUTS",
    title: "Schedule payments.",
    description:
      "Schedule vendor payments and payroll in advance via NEFT, RTGS and IMPS — with maker-checker approvals built in.",
    mock: <ScheduleMock />,
  },
  {
    no: "06",
    eyebrow: "SECURE",
    title: "Secure transactions.",
    description:
      "Bank-grade security with multi-factor authentication and encryption protecting every rupee of your financial data.",
    mock: <SecureMock />,
  },
];

/* ---------- section ---------- */

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-12">
          <p className="eyebrow mb-3">Features</p>
          <h2 className="section-title">Powerful Features for Your Business</h2>
          <p className="section-subtitle mb-0">
            Everything you need to manage your business finances efficiently in one place.
          </p>
        </div>

        {/* ruled matrix — cells separated only by hairlines, reads like a spec sheet */}
        <div className="border border-border rounded overflow-hidden grid md:grid-cols-3 divide-y divide-x divide-border">
          {features.map((f, i) => (
            <motion.article
              key={f.no}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: (i % 3) * 0.06 }}
              className="flex flex-col bg-white p-7 md:p-8 focus-within:outline focus-within:outline-2 focus-within:outline-primary"
            >
              <div className="flex items-center gap-3 mb-5">
                <span className="tabular text-secondary text-sm font-semibold">{f.no}</span>
                <span className="rule flex-1" />
                <span className="eyebrow before:hidden">{f.eyebrow}</span>
              </div>
              <h3 className="text-xl md:text-2xl leading-tight font-bold text-slate-900 mb-3">
                {f.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">{f.description}</p>
              <div className="mt-auto pt-8">{f.mock}</div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
