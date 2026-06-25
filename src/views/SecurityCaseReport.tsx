"use client";

import {
  Shield,
  AlertTriangle,
  FileText,
  Lock,
  Search,
  GitBranch,
  UserX,
  Activity,
  ClipboardCheck,
  Building2,
  Calendar,
  Hash,
  Mail,
  ArrowRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldAlert,
  Fingerprint,
  Server,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const CASE_ID = "ACZ-SEC-2026-0625-48192";

const metaRows = [
  { icon: <Hash className="h-4 w-4" />, label: "Case ID", value: CASE_ID },
  { icon: <ShieldAlert className="h-4 w-4" />, label: "Severity", value: "High" },
  { icon: <Activity className="h-4 w-4" />, label: "Status", value: "Open – Under Investigation" },
  { icon: <Building2 className="h-4 w-4" />, label: "Departments", value: "IT 25031 · Technical 25036" },
  { icon: <FileText className="h-4 w-4" />, label: "Category", value: "Identity Attribution & Deployment Authorization" },
  { icon: <UserX className="h-4 w-4" />, label: "Reported By", value: "TEJA M — 260614" },
  { icon: <Building2 className="h-4 w-4" />, label: "Organization", value: "Aczen Technologies Pvt Ltd" },
  { icon: <Calendar className="h-4 w-4" />, label: "Date Reported", value: "25 June 2026" },
];

const repoFindings = [
  "Repository ownership remains under the organization's control.",
  "Recent commits were observed using a generic author identity rather than the expected developer identity.",
  "Deployment operations functioned normally for an extended period before the issue surfaced.",
  "The reported account was not immediately identifiable within current project operations.",
];

const securityFindings = [
  { ok: true, text: "No confirmed unauthorized repository access has been identified." },
  { ok: true, text: "No confirmed credential compromise has been identified." },
  { ok: true, text: "No confirmed malware indicators have been identified during initial review." },
  { ok: false, text: "Current evidence suggests an attribution, identity mapping, or deployment authorization anomaly rather than a confirmed security breach." },
];

const potentialRisks = [
  "Incorrect identity attribution within deployment systems.",
  "Inaccurate software supply-chain audit trails.",
  "Repository ownership verification inconsistencies.",
  "Deployment authorization control failures.",
  "Governance, Risk, and Compliance (GRC) reporting inaccuracies.",
  "Potential trust and integrity concerns affecting production deployment workflows.",
];

const businessImpact = [
  "Deployment interruption.",
  "Delayed release cycles.",
  "Increased compliance review requirements.",
  "Reduced confidence in deployment audit records.",
];

const investigationQuestions = [
  {
    icon: <Fingerprint className="h-5 w-5" />,
    q: "What source generated the attribution to the account \"superman32432432\"?",
    items: [
      "Repository metadata",
      "Commit metadata",
      "Identity synchronization records",
      "Deployment platform authorization systems",
      "Third-party integrations",
      "Historical repository records",
    ],
  },
  {
    icon: <GitBranch className="h-5 w-5" />,
    q: "Why were previous deployments accepted while the recent deployment was blocked?",
  },
  {
    icon: <ShieldAlert className="h-5 w-5" />,
    q: "Are there any security, trust, or compliance concerns requiring further action?",
  },
  {
    icon: <Eye className="h-5 w-5" />,
    q: "Can platform logs identify the exact event responsible for the authorization failure?",
  },
];

const requestedActions = [
  "Review deployment authorization logs.",
  "Review identity attribution records.",
  "Validate repository ownership mapping.",
  "Verify contributor authorization records.",
  "Confirm whether any external account associations exist.",
  "Provide root-cause analysis and remediation recommendations.",
];

const timeline = [
  { time: "T-0", title: "Anomaly Detected", desc: "Deployment validation surfaced an unrecognized external account attribution during a production deployment." },
  { time: "T+1", title: "Authorization Failure", desc: "Deployment was rejected by author verification controls referencing the account \"superman32432432\"." },
  { time: "T+2", title: "Internal Review", desc: "Repository owner confirmed no known relationship, member association, or authorization for the reported account." },
  { time: "T+3", title: "Case Filed", desc: `Formal report ${CASE_ID} created and routed to Security & Trust review.` },
];

const SecurityCaseReport = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <Navbar />

      {/* Hero / Case Header */}
      <section className="relative pt-28 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 25% 25%, rgba(99,102,241,0.25) 0, transparent 40%), radial-gradient(circle at 75% 75%, rgba(56,189,248,0.2) 0, transparent 40%)",
        }} />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <Badge className="bg-red-500/20 text-red-200 border border-red-400/30 hover:bg-red-500/25">
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                Severity: High
              </Badge>
              <Badge className="bg-amber-500/20 text-amber-200 border border-amber-400/30 hover:bg-amber-500/25">
                <Activity className="h-3.5 w-3.5 mr-1.5" />
                Status: Open
              </Badge>
              <Badge className="bg-slate-500/20 text-slate-200 border border-slate-400/30 hover:bg-slate-500/25">
                <Shield className="h-3.5 w-3.5 mr-1.5" />
                Public Disclosure
              </Badge>
              <Badge className="bg-blue-500/20 text-blue-200 border border-blue-400/30 hover:bg-blue-500/25">
                Jurisdiction: India
              </Badge>
            </div>

            <p className="text-sm uppercase tracking-[0.2em] text-slate-400 mb-3">
              Security &amp; Trust Investigation Report
            </p>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
              Identity Attribution &amp; Deployment Authorization Anomaly
            </h1>
            <p className="text-lg text-slate-300 mb-8 max-w-3xl">
              Formal public disclosure of an investigation into an unexpected account attribution
              observed during a production deployment workflow at Aczen Technologies Pvt Ltd.
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur">
              <Hash className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-mono text-slate-200">{CASE_ID}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Meta Card */}
      <section className="-mt-10 pb-12 relative z-10">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <Card className="shadow-2xl border-slate-200/80">
              <CardContent className="p-6 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  {metaRows.map((row) => (
                    <div key={row.label} className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-0">
                      <div className="mt-0.5 p-1.5 rounded-md bg-slate-100 text-slate-600">
                        {row.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs uppercase tracking-wider text-slate-500">{row.label}</div>
                        <div className="text-sm font-medium text-slate-900 break-words">{row.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Executive Summary */}
      <section className="py-10">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <SectionHeading icon={<FileText className="h-5 w-5" />} eyebrow="Section 01" title="Executive Summary" />
            <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-sm space-y-4 text-slate-700 leading-relaxed">
              <p>
                An anomaly was identified within the source code management and deployment workflow
                involving an unexpected account attribution during a production deployment process.
              </p>
              <p>
                During deployment validation, the platform reported that the deployment was associated
                with an external account identified as{" "}
                <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-sm text-slate-900">
                  superman32432432
                </code>
                . This account is not recognized by the repository owner and has no known authorization,
                ownership, or operational relationship with the project.
              </p>
              <p>
                The event resulted in deployment authorization failure and raised concerns regarding
                identity mapping, repository attribution, deployment governance, and audit trail integrity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Incident Description */}
      <section className="py-10">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <SectionHeading icon={<AlertTriangle className="h-5 w-5" />} eyebrow="Section 02" title="Incident Description" />

            <Alert className="mb-6 border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-700" />
              <AlertTitle className="text-amber-900">Deployment Rejected</AlertTitle>
              <AlertDescription className="text-amber-800">
                A deployment request originating from the project's primary repository was rejected
                due to author verification controls.
              </AlertDescription>
            </Alert>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base text-slate-700">Reported Account</CardTitle>
                <CardDescription>
                  The deployment platform reported that the deployment request was linked to:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-900 text-slate-100 font-mono">
                  <UserX className="h-5 w-5 text-red-400" />
                  <span className="text-sm text-slate-400">Username:</span>
                  <span className="text-base">superman32432432</span>
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">
                    Repository owner's internal review determined:
                  </h4>
                  <ul className="space-y-2">
                    {[
                      "No known relationship exists with the reported account.",
                      "No organizational member is associated with the reported account.",
                      "No intentional authorization was granted to the reported account.",
                      "Current repository ownership remains unchanged.",
                      "No direct evidence of repository compromise has been identified.",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-slate-700">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-10">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <SectionHeading icon={<Activity className="h-5 w-5" />} eyebrow="Section 03" title="Event Timeline" />
            <div className="relative">
              <div className="absolute left-4 top-2 bottom-2 w-px bg-gradient-to-b from-indigo-400 via-slate-300 to-slate-200" />
              <ol className="space-y-6">
                {timeline.map((event, idx) => (
                  <li key={event.title} className="relative pl-12">
                    <div className="absolute left-0 top-1.5 h-8 w-8 rounded-full bg-white border-2 border-indigo-500 shadow-md flex items-center justify-center">
                      <span className="text-xs font-bold text-indigo-600">{idx + 1}</span>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {event.time}
                        </span>
                        <h4 className="font-semibold text-slate-900">{event.title}</h4>
                      </div>
                      <p className="text-sm text-slate-600">{event.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Observed Findings */}
      <section className="py-10">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <SectionHeading icon={<Search className="h-5 w-5" />} eyebrow="Section 04" title="Observed Findings" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-slate-200">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-md bg-blue-50 text-blue-600">
                      <GitBranch className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-lg">Repository Findings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {repoFindings.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                        <ArrowRight className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-md bg-emerald-50 text-emerald-600">
                      <Lock className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-lg">Security Findings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {securityFindings.map((f) => (
                      <li key={f.text} className="flex items-start gap-2 text-sm text-slate-700">
                        {f.ok ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <HelpCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        )}
                        <span>{f.text}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Risk Assessment */}
      <section className="py-10">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <SectionHeading icon={<ShieldAlert className="h-5 w-5" />} eyebrow="Section 05" title="Risk Assessment" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-slate-200 bg-gradient-to-br from-rose-50/40 to-white">
                <CardHeader>
                  <CardTitle className="text-base text-slate-900">Potential Risks</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2.5">
                    {potentialRisks.map((r) => (
                      <li key={r} className="flex items-start gap-2 text-sm text-slate-700">
                        <XCircle className="h-4 w-4 text-rose-500 mt-0.5 flex-shrink-0" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-gradient-to-br from-amber-50/40 to-white">
                <CardHeader>
                  <CardTitle className="text-base text-slate-900">Business Impact</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2.5">
                    {businessImpact.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm text-slate-700">
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Investigation Objectives */}
      <section className="py-10">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <SectionHeading icon={<HelpCircle className="h-5 w-5" />} eyebrow="Section 06" title="Investigation Objectives" />
            <p className="text-slate-600 mb-6">The following questions require clarification:</p>
            <div className="grid grid-cols-1 gap-4">
              {investigationQuestions.map((qa, idx) => (
                <Card key={qa.q} className="border-slate-200">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        {qa.icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-slate-400 mb-1">Q{idx + 1}</div>
                        <p className="text-slate-900 font-medium mb-2">{qa.q}</p>
                        {qa.items && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {qa.items.map((item) => (
                              <span key={item} className="text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                {item}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Requested Actions */}
      <section className="py-10">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <SectionHeading icon={<ClipboardCheck className="h-5 w-5" />} eyebrow="Section 07" title="Requested Actions" />
            <Card className="border-slate-200">
              <CardHeader>
                <CardDescription>
                  The platform security, trust, and compliance teams are requested to:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {requestedActions.map((action, idx) => (
                    <div
                      key={action}
                      className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center">
                        {idx + 1}
                      </div>
                      <span className="text-sm text-slate-700">{action}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Current Status */}
      <section className="py-10">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <SectionHeading icon={<Server className="h-5 w-5" />} eyebrow="Section 08" title="Current Status" />
            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 md:p-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                </span>
                <span className="font-semibold text-slate-900">Status: Open Investigation</span>
              </div>
              <p className="text-slate-700 leading-relaxed">
                At the time of filing this report, no evidence has been found indicating confirmed
                unauthorized access, repository compromise, or malicious activity. However, the identity
                attribution inconsistency and resulting deployment block require formal review to ensure
                platform trust, governance compliance, and deployment integrity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Case Card */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="rounded-2xl bg-slate-900 text-slate-100 p-8 md:p-10 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">
                    Case Reference
                  </div>
                  <div className="text-2xl font-mono font-semibold text-white">{CASE_ID}</div>
                  <p className="text-slate-400 mt-2 text-sm">
                    Prepared by Aczen Technologies Pvt Ltd — Security &amp; Compliance Review
                  </p>
                </div>
                <a
                  href="mailto:security@aczen.tech?subject=Re%3A%20Case%20ACZ-SEC-2026-0625-48192"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-white text-slate-900 font-medium hover:bg-slate-100 transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  security@aczen.tech
                </a>
              </div>
            </div>
            <p className="text-center text-xs text-slate-400 mt-6">
              This document constitutes a public disclosure of an active investigation and may be
              updated as new information becomes available.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

const SectionHeading = ({
  icon,
  eyebrow,
  title,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
}) => (
  <div className="mb-6">
    <div className="flex items-center gap-2 text-indigo-600 text-xs uppercase tracking-[0.2em] font-medium mb-2">
      {icon}
      <span>{eyebrow}</span>
    </div>
    <h2 className="text-2xl md:text-3xl font-bold text-slate-900">{title}</h2>
  </div>
);

export default SecurityCaseReport;
