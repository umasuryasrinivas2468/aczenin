"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import {
  Terminal,
  Copy,
  Check,
  Download,
  ShieldCheck,
  AlertTriangle,
  Boxes,
  Folder,
  Globe,
  PlayCircle,
  HelpCircle,
} from "lucide-react";

const ONE_LINER = "irm https://aczen.in/install.ps1 | iex";
const RAW_URL = "https://aczen.in/install.ps1";
const REPO_URL = "https://github.com/umasuryasrinivas2468/bill-ease-india-44.git";

type CodeBlockProps = {
  code: string;
  id: string;
  language?: string;
};

const CodeBlock = ({ code, id, language = "powershell" }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard not available */
    }
  };

  return (
    <div className="relative group">
      <div className="absolute top-3 left-4 text-[10px] uppercase tracking-wider text-gray-400 font-mono">
        {language}
      </div>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy command"
        className="absolute top-2 right-2 flex items-center gap-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 px-2.5 py-1.5 rounded-md transition-colors"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5" /> Copied
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" /> Copy
          </>
        )}
      </button>
      <pre
        id={id}
        className="bg-gray-950 text-gray-100 rounded-lg p-4 pt-8 overflow-x-auto text-sm leading-relaxed font-mono"
      >
        <code>{code}</code>
      </pre>
    </div>
  );
};

const Install = () => {
  const steps = [
    {
      icon: <ShieldCheck className="w-5 h-5" />,
      title: "Checks prerequisites",
      detail:
        "Verifies that git, node, and npm are installed and available on your PATH. Exits with a clear error if any are missing.",
    },
    {
      icon: <Download className="w-5 h-5" />,
      title: "Clones the Aczen app",
      detail: (
        <>
          Clones the project into <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">$HOME\aczen-app</code>.
          If the folder already exists with a valid <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">package.json</code>, the step is skipped.
        </>
      ),
    },
    {
      icon: <Boxes className="w-5 h-5" />,
      title: "Installs dependencies",
      detail: (
        <>
          Runs <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">npm install</code> inside the project directory to pull every package the app needs.
        </>
      ),
    },
    {
      icon: <PlayCircle className="w-5 h-5" />,
      title: "Starts the dev server",
      detail: (
        <>
          Launches <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">npm run dev</code> in a new PowerShell window on port <strong>5173</strong> so the install console stays free.
        </>
      ),
    },
    {
      icon: <Globe className="w-5 h-5" />,
      title: "Opens your browser",
      detail: (
        <>
          Polls <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">http://localhost:5173</code> for up to 60 seconds and opens it as soon as the server responds.
        </>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Install Guide — Aczen one-line PowerShell installer"
        description="Step-by-step guide for installing the Aczen app on Windows using a single PowerShell command. Learn what install.ps1 does, prerequisites, and troubleshooting."
        keywords="Aczen install, install.ps1, Aczen PowerShell installer, Aczen Windows setup, aczen dev setup"
        path="/install"
      />
      <Navbar />

      <main className="pt-24 pb-20">
        {/* Breadcrumb */}
        <div className="container mx-auto px-4 mb-6">
          <div className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-gray-500 hover:text-gray-700">Home</Link>
            <span className="text-gray-400">/</span>
            <Link href="/docs" className="text-gray-500 hover:text-gray-700">Docs</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">Install</span>
          </div>
        </div>

        {/* Hero */}
        <section className="container mx-auto px-4 mb-12">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 text-xs font-medium px-3 py-1 rounded-full mb-5">
              <Terminal className="w-3.5 h-3.5" />
              Windows · PowerShell
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
              Install Aczen with a single command
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl">
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">install.ps1</code> is a small PowerShell
              script that clones the Aczen app, installs its dependencies, starts the dev server, and opens it in your browser — in one go.
            </p>
          </div>
        </section>

        {/* Quick start */}
        <section className="container mx-auto px-4 mb-16">
          <div className="max-w-4xl">
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Quick start</h2>
            <p className="text-gray-600 mb-5">
              Open a <strong>PowerShell</strong> window and run:
            </p>

            <CodeBlock code={ONE_LINER} id="oneliner" />

            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Safe to read first</p>
                  <p className="text-sm text-gray-600">
                    Inspect the script before running it:{" "}
                    <a
                      href={RAW_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      view install.ps1
                    </a>
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
                <Folder className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Installs to</p>
                  <p className="text-sm text-gray-600 font-mono">$HOME\aczen-app</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Prerequisites */}
        <section className="container mx-auto px-4 mb-16">
          <div className="max-w-4xl">
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Prerequisites</h2>
            <p className="text-gray-600 mb-5">
              The installer will refuse to run if any of these are missing:
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { name: "Git", hint: "Any recent version", url: "https://git-scm.com/download/win" },
                { name: "Node.js", hint: "v18 or newer", url: "https://nodejs.org/en/download" },
                { name: "npm", hint: "Ships with Node.js", url: "https://nodejs.org/en/download" },
              ].map((p) => (
                <a
                  key={p.name}
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block p-5 border border-gray-200 rounded-lg hover:border-gray-400 hover:shadow-sm transition-all"
                >
                  <div className="text-sm font-semibold text-gray-900">{p.name}</div>
                  <div className="text-sm text-gray-500 mt-1">{p.hint}</div>
                  <div className="text-xs text-blue-600 mt-2">Download →</div>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* What it does */}
        <section className="container mx-auto px-4 mb-16">
          <div className="max-w-4xl">
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">What the script does</h2>
            <p className="text-gray-600 mb-6">
              Each step runs in order. If any step fails, the script exits with a clear error message so you know
              where to pick up.
            </p>

            <ol className="space-y-4">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-4 p-5 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-900 text-white shrink-0">
                    {s.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-mono text-gray-400">0{i + 1}</span>
                      <h3 className="text-base font-semibold text-gray-900">{s.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{s.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Manual install */}
        <section className="container mx-auto px-4 mb-16">
          <div className="max-w-4xl">
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Prefer to do it manually?</h2>
            <p className="text-gray-600 mb-5">
              The one-liner is just a convenience. These three commands do exactly the same thing:
            </p>
            <CodeBlock
              id="manual"
              code={`git clone ${REPO_URL} $HOME\\aczen-app
cd $HOME\\aczen-app
npm install
npm run dev`}
            />
          </div>
        </section>

        {/* Troubleshooting */}
        <section className="container mx-auto px-4 mb-16">
          <div className="max-w-4xl">
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Troubleshooting</h2>

            <div className="space-y-4">
              <div className="p-5 border border-gray-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      "running scripts is disabled on this system"
                    </h3>
                    <p className="text-sm text-gray-600 mt-1 mb-3">
                      PowerShell's execution policy is blocking the script. Allow scripts for the current
                      session only:
                    </p>
                    <CodeBlock
                      id="execpolicy"
                      code="Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass"
                    />
                  </div>
                </div>
              </div>

              <div className="p-5 border border-gray-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      "'$projectDir' exists but is not a valid project"
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      A folder called <code className="bg-gray-100 px-1 rounded">aczen-app</code> already exists
                      in your home directory but doesn't contain a <code className="bg-gray-100 px-1 rounded">package.json</code>.
                      Delete it (or move it) and re-run the installer.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 border border-gray-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      "Dev server did not respond within 60s"
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      The install finished, but the dev server is still warming up. Wait a few more seconds, then open{" "}
                      <a
                        href="http://localhost:5173"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        http://localhost:5173
                      </a>{" "}
                      manually. Watch the second PowerShell window for any build errors.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 border border-gray-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Port 5173 already in use</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Another Vite app is probably running. Stop it, or change the port in the project's{" "}
                      <code className="bg-gray-100 px-1 rounded">vite.config.ts</code>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Next steps */}
        <section className="container mx-auto px-4">
          <div className="max-w-4xl">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 text-white">
              <div className="flex items-start gap-4">
                <HelpCircle className="w-6 h-6 shrink-0 mt-1" />
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold mb-2">Need a hand?</h2>
                  <p className="text-gray-300 mb-5">
                    If the installer fails or you hit something unusual, check the full documentation or reach out
                    to the team.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/docs"
                      className="bg-white text-gray-900 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100"
                    >
                      Read the docs
                    </Link>
                    <Link
                      href="/contacts"
                      className="border border-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-white/10"
                    >
                      Contact support
                    </Link>
                  </div>
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

export default Install;
