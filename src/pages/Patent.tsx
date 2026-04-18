import { useState } from "react";
import {
  ShieldCheck,
  Sparkles,
  Workflow,
  DatabaseZap,
  Clock3,
  BadgeCheck,
  FileText,
  Target,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const Patent = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  const features = [
    {
      icon: Sparkles,
      title: "Unified Intelligence",
      description:
        "A single intelligence layer that connects accounting, banking and compliance decisions in real time.",
    },
    {
      icon: ShieldCheck,
      title: "Compliance by Design",
      description:
        "Built-in controls, audit trails and governance workflows across every financial operation.",
    },
    {
      icon: Workflow,
      title: "End-to-End Automation",
      description:
        "From payable workflows to reconciliation and supply chain operations, every process stays connected.",
    },
    {
      icon: DatabaseZap,
      title: "Operational Data Core",
      description:
        "Structured business data, invoice events and banking activity converge into one operating system.",
    },
  ];

  const progress = [
    {
      stage: "Initial Filing",
      date: "February 20 2026",
      status: "Completed",
      detail:
        "Patent application submitted under the Indian patent framework with complete technical specification.",
    },
    {
      stage: "Publication Queue",
      date: "In Progress",
      status: "In Review",
      detail:
        "Application is progressing through standard publication and examiner workflow.",
    },
    {
      stage: "Examination",
      date: "Upcoming",
      status: "Pending",
      detail:
        "Technical and legal examination of novelty, inventive step and industrial applicability.",
    },
    {
      stage: "Grant Decision",
      date: "Upcoming",
      status: "Pending",
      detail:
        "Final determination by the patent office after examination responses and clarifications.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-smebank-50 via-white to-smeteal-50 text-smebank-950">
      <SEO
        title="Aczen Patents — Innovation in Financial Automation"
        description="Explore Aczen's patent portfolio covering financial automation, compliance workflows and AI-driven accounting technologies."
        keywords="Aczen patents, fintech patents India, financial automation IP, Aczen innovation"
        path="/patent"
      />
      <Navbar />

      <main className="pt-24 pb-16">
        <section className="container mx-auto px-4">
          <div className="rounded-3xl border border-smebank-200 bg-white/90 p-6 md:p-10 shadow-xl backdrop-blur">
            <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <span className="inline-flex items-center rounded-full border border-smebank-200 bg-smebank-50 px-4 py-2 text-sm text-smebank-800">
                  Patent Pending Technology
                </span>

                <h1 className="mt-6 text-4xl font-semibold leading-tight md:text-6xl">
                  Innovation in{" "}
                  <span className="bg-gradient-to-r from-smebank-600 to-smeteal-500 bg-clip-text text-transparent">
                    Progress
                  </span>
                </h1>

                <p className="mt-6 max-w-3xl text-lg leading-relaxed text-smebank-800">
                  Aczen is building the{" "}
                  <span className="font-semibold text-smeteal-700">
                    world&apos;s first unified financial operating system
                  </span>{" "}
                  for integrated accounting, banking, compliance, supply chain
                  and time tracking.
                </p>

                <div className="mt-8 rounded-2xl border border-smebank-200 bg-smebank-50/60 p-6 md:p-8">
                  <div className="text-sm text-smebank-700">
                    Patent Application
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <p className="font-mono text-2xl tracking-wide text-smebank-700 md:text-3xl">
                      202641019639
                    </p>
                    <span className="rounded-full border border-smeteal-300 bg-smeteal-100 px-3 py-1 text-sm text-smeteal-800">
                      Pending
                    </span>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-sm text-smebank-700">Filing Date</div>
                      <div className="mt-1 text-lg">February 20, 2026</div>
                    </div>
                    <div>
                      <div className="text-sm text-smebank-700">Patent Type</div>
                      <div className="mt-1 text-lg">Method and System</div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h2 className="text-sm text-smebank-700">Patent Title</h2>
                    <p className="mt-2 text-lg leading-relaxed text-smebank-900">
                      A METHOD AND SYSTEM FOR INTEGRATED ACCOUNTING, BANKING,
                      COMPLIANCE, SUPPLY CHAIN AND TIME TRACKING
                    </p>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div>
                      <h2 className="text-sm text-smebank-700">Inventors</h2>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <div className="flex items-center gap-2 rounded-full border border-smebank-200 bg-white px-2 py-1">
                          <img
                            src="/images/SPEAKER.jpg"
                            alt="Uma Surya Srinivas"
                            className="h-10 w-10 rounded-full object-cover"
                          />
                          <span className="pr-2 text-sm text-smebank-900">
                            B Uma Surya Srinivas
                          </span>
                        </div>
                        <div className="flex items-center gap-2 rounded-full border border-smebank-200 bg-white px-2 py-1">
                          <img
                            src="/images/director2.jpg"
                            alt="Venkatesh"
                            className="h-10 w-10 rounded-full object-cover"
                          />
                          <span className="pr-2 text-sm text-smebank-900">
                            M Shiva Sai Venkatesh Yadav
                          </span>
                        </div>
                        <div className="flex items-center gap-2 rounded-full border border-smebank-200 bg-white px-2 py-1">
                          <img
                            src="/images/director3.jpg"
                            alt="Neelam Charitha"
                            className="h-10 w-10 rounded-full object-cover"
                          />
                          <span className="pr-2 text-sm text-smebank-900">
                            Neelam Charitha
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h2 className="text-sm text-smebank-700">Applicant</h2>
                      <p className="mt-2 text-smebank-900">
                        Aczen Technologies Private Limited
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  const isActive = activeFeature === index;
                  return (
                    <button
                      key={feature.title}
                      type="button"
                      onClick={() => setActiveFeature(index)}
                      className={`rounded-2xl border p-5 text-left transition-all duration-300 ${
                        isActive
                          ? "border-smebank-400 bg-smebank-50 shadow-[0_12px_28px_rgba(9,103,227,0.12)]"
                          : "border-smebank-200 bg-white hover:border-smeteal-300 hover:bg-smeteal-50/40"
                      }`}
                    >
                      <div className="inline-flex rounded-xl border border-smebank-200 bg-smebank-50 p-3">
                        <Icon className="h-5 w-5 text-smebank-600" />
                      </div>
                      <h3 className="mt-4 text-2xl font-semibold">{feature.title}</h3>
                      <p className="mt-2 text-smebank-700">{feature.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
              <div className="rounded-2xl border border-smebank-200 bg-white p-6">
                <h3 className="text-2xl font-semibold">Highlights</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-smebank-200 bg-smebank-50 p-3 text-center">
                    <p className="text-2xl font-semibold text-smebank-700">9</p>
                    <p className="text-sm text-smebank-700">Claims</p>
                  </div>
                  <div className="rounded-xl border border-smebank-200 bg-smebank-50 p-3 text-center">
                    <p className="text-2xl font-semibold text-smebank-700">4</p>
                    <p className="text-sm text-smebank-700">System Architectures</p>
                  </div>
                  <div className="rounded-xl border border-smebank-200 bg-smebank-50 p-3 text-center">
                    <p className="text-2xl font-semibold text-smebank-700">7%</p>
                    <p className="text-sm text-smebank-700">Similarity</p>
                  </div>
                </div>

                <h3 className="mt-6 text-2xl font-semibold">Key Claims</h3>
                <ul className="mt-4 space-y-3 text-smebank-800">
                  <li className="flex items-start gap-2">
                    <BadgeCheck className="mt-1 h-4 w-4 text-smeteal-600" />
                    Unified operating framework across financial and business
                    operations.
                  </li>
                  <li className="flex items-start gap-2">
                    <FileText className="mt-1 h-4 w-4 text-smeteal-600" />
                    Compliance-aware transaction and accounting automation.
                  </li>
                  <li className="flex items-start gap-2">
                    <Target className="mt-1 h-4 w-4 text-smeteal-600" />
                    Integrated supply chain and time tracking event model.
                  </li>
                  <li className="flex items-start gap-2">
                    <Clock3 className="mt-1 h-4 w-4 text-smeteal-600" />
                    Real-time visibility, reconciliation and decision support.
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-smebank-200 bg-white p-6">
                <h3 className="text-2xl font-semibold">Patent Progress</h3>
                <div className="mt-5 space-y-3">
                  {progress.map((step, index) => {
                    const isActive = activeStep === index;
                    return (
                      <button
                        key={step.stage}
                        type="button"
                        onClick={() => setActiveStep(index)}
                        className={`w-full rounded-xl border p-4 text-left transition-colors ${
                          isActive
                            ? "border-smebank-400 bg-smebank-50"
                            : "border-smebank-200 bg-white hover:border-smeteal-300 hover:bg-smeteal-50/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-lg font-medium">{step.stage}</p>
                            <p className="text-sm text-smebank-700">{step.date}</p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs ${
                              step.status === "Completed"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : step.status === "In Review"
                                  ? "bg-amber-500/20 text-amber-300"
                                  : "bg-zinc-500/20 text-zinc-300"
                            }`}
                          >
                            {step.status}
                          </span>
                        </div>
                        {isActive && (
                          <p className="mt-3 border-t border-smebank-200 pt-3 text-sm text-smebank-800">
                            {step.detail}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Patent;
