"use client";

import { motion, type Variants } from "framer-motion";
import { ArrowRight, Check, type LucideIcon } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

/* ---------- content contract ---------- */

export type SolutionFeature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export type SolutionContent = {
  path: string;
  seo: { title: string; description: string; keywords?: string };
  eyebrow: string;
  icon: LucideIcon;
  title: string;
  titleHighlight: string;
  subtitle: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  stats: { value: string; label: string }[];
  features: SolutionFeature[];
  benefitsHeading: string;
  benefitsSubtitle?: string;
  benefits: string[];
  ctaTitle: string;
  ctaSubtitle: string;
};

const DEFAULT_PRIMARY = {
  label: "Book a Demo",
  href: "https://cal.com/aczen-technologies-pvt-ltd-t7jdhz/30min",
};
const DEFAULT_SECONDARY = { label: "View Pricing", href: "/pricing" };

/* ---------- motion ---------- */

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

const CtaButton = ({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost" | "light";
}) => {
  const external = href.startsWith("http");
  const styles = {
    primary:
      "bg-gradient-to-r from-smebank-700 to-smeteal-600 text-white shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 active:translate-y-0",
    ghost:
      "border border-black/[0.08] bg-white text-foreground hover:border-smebank-300 hover:text-smebank-700 hover:-translate-y-0.5 active:translate-y-0",
    light:
      "bg-white text-smebank-700 shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 active:translate-y-0",
  } as const;
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all duration-300 ${styles[variant]}`}
    >
      {children}
    </a>
  );
};

const SolutionTemplate = ({ content }: { content: SolutionContent }) => {
  const {
    path,
    seo,
    eyebrow,
    icon: HeroIcon,
    title,
    titleHighlight,
    subtitle,
    primaryCta = DEFAULT_PRIMARY,
    secondaryCta = DEFAULT_SECONDARY,
    stats,
    features,
    benefitsHeading,
    benefitsSubtitle,
    benefits,
    ctaTitle,
    ctaSubtitle,
  } = content;

  return (
    <div className="min-h-screen">
      <SEO
        title={seo.title}
        description={seo.description}
        keywords={seo.keywords}
        path={path}
      />
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-smebank-50 via-smeteal-50/60 to-white pt-28 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="max-w-xl"
            >
              <motion.span
                variants={item}
                className="inline-flex items-center gap-2 rounded-full bg-smebank-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-smebank-700"
              >
                <HeroIcon className="h-3.5 w-3.5" />
                {eyebrow}
              </motion.span>
              <motion.h1
                variants={item}
                className="mt-5 text-4xl font-bold leading-tight text-foreground md:text-5xl"
              >
                {title}{" "}
                <span className="bg-gradient-to-r from-smebank-600 to-smeteal-600 bg-clip-text text-transparent">
                  {titleHighlight}
                </span>
              </motion.h1>
              <motion.p
                variants={item}
                className="mt-5 text-lg leading-relaxed text-muted-foreground"
              >
                {subtitle}
              </motion.p>
              <motion.div variants={item} className="mt-8 flex flex-wrap gap-3">
                <CtaButton href={primaryCta.href}>
                  {primaryCta.label}
                  <ArrowRight className="h-4 w-4" />
                </CtaButton>
                <CtaButton href={secondaryCta.href} variant="ghost">
                  {secondaryCta.label}
                </CtaButton>
              </motion.div>
            </motion.div>

            {/* Hero visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="relative"
            >
              <div className="rounded-3xl border border-black/[0.06] bg-white p-8 shadow-soft-lg">
                <div className="mb-6 flex items-center gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-smebank-100 to-smeteal-100 text-smebank-600">
                    <HeroIcon className="h-7 w-7" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{eyebrow}</p>
                    <p className="text-xs text-muted-foreground">Powered by Aczen</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {features.slice(0, 3).map((f) => (
                    <div
                      key={f.title}
                      className="flex items-center gap-3 rounded-xl bg-smebank-50/60 p-3"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {f.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {stats[0] && (
                <div className="absolute -bottom-5 -left-5 hidden rounded-2xl border border-smebank-100 bg-white px-5 py-4 shadow-soft sm:block">
                  <p className="text-2xl font-bold text-smebank-700">{stats[0].value}</p>
                  <p className="text-xs text-muted-foreground">{stats[0].label}</p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-black/[0.06] bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((s) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="text-center"
              >
                <p className="text-3xl font-bold bg-gradient-to-r from-smebank-600 to-smeteal-600 bg-clip-text text-transparent">
                  {s.value}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gradient-to-b from-white to-smebank-50/40 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              Everything you need, built in
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">
              A complete toolkit designed to make {eyebrow.toLowerCase()} effortless.
            </p>
          </div>
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  variants={item}
                  className="group rounded-3xl border border-black/[0.06] bg-white p-7 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg"
                >
                  <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-smebank-50 to-smeteal-100 text-smebank-600 transition-transform group-hover:scale-105">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    {f.title}
                  </h3>
                  <p className="leading-relaxed text-muted-foreground">{f.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Benefits split */}
      <section className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold text-foreground md:text-4xl">
                {benefitsHeading}
              </h2>
              {benefitsSubtitle && (
                <p className="mt-4 text-lg text-muted-foreground">{benefitsSubtitle}</p>
              )}
              <div className="mt-8 space-y-4">
                {benefits.map((b, i) => (
                  <motion.div
                    key={b}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: i * 0.05 }}
                    className="flex items-start gap-3"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    <span className="text-foreground">{b}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5 }}
              className="rounded-3xl bg-gradient-to-br from-smebank-700 via-smebank-900 to-smeteal-900 p-8 text-white shadow-soft md:p-10"
            >
              <HeroIcon className="mb-5 h-9 w-9 text-smebank-200" />
              <p className="text-2xl font-semibold leading-snug">{content.title} {titleHighlight}</p>
              <p className="mt-3 text-smebank-100/80">{subtitle}</p>
              <div className="mt-8 grid grid-cols-2 gap-4">
                {stats.slice(0, 2).map((s) => (
                  <div
                    key={s.label}
                    className="rounded-2xl bg-white/10 p-4 backdrop-blur"
                  >
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-smebank-100/70">{s.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-smebank-700 to-smeteal-600 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl">{ctaTitle}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">{ctaSubtitle}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <CtaButton href={primaryCta.href} variant="light">
              {primaryCta.label}
              <ArrowRight className="h-4 w-4" />
            </CtaButton>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SolutionTemplate;
