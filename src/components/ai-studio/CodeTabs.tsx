"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export default function CodeTabs({ samples }: { samples: Array<{ label: string; code: string }> }) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0b1220] shadow-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-2">
        <div role="tablist" aria-label="Language" className="flex">
          {samples.map((sample, index) => (
            <button
              key={sample.label}
              role="tab"
              type="button"
              aria-selected={index === active}
              onClick={() => { setActive(index); setCopied(false); }}
              className={cn(
                "relative px-3.5 py-3 text-[0.8rem] font-medium transition",
                index === active ? "text-white" : "text-white/50 hover:text-white/80",
              )}
            >
              {sample.label}
              {index === active && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-smeorange-400" aria-hidden />}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(samples[active].code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            } catch {
              setCopied(false);
            }
          }}
          className="mr-1 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-white/60 hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-5 text-[0.8rem] leading-relaxed text-slate-200 [font-family:var(--font-studio-mono),monospace]">
        <code>{samples[active].code}</code>
      </pre>
    </div>
  );
}
