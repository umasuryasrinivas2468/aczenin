"use client";

import { BookOpen, FileSpreadsheet, Receipt, Landmark, Building2, MoreHorizontal } from "lucide-react";
import Reveal from "@/components/motion/Reveal";

const integrations = [
  { name: "Tally", icon: BookOpen },
  { name: "Zoho Books", icon: FileSpreadsheet },
  { name: "QuickBooks", icon: Receipt },
  { name: "GSTN", icon: Landmark },
  { name: "Bank Feeds", icon: Building2 },
  { name: "Others", icon: MoreHorizontal },
];

const IntegrationsStrip = () => {
  return (
    <section className="pb-16 px-4">
      <div className="container mx-auto max-w-3xl text-center">
        <Reveal>
          <p className="text-sm text-gray-500 mb-6">
            Integrate with the accounting tools you already use. No need to switch platforms.
          </p>
        </Reveal>

        <Reveal>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {integrations.map(({ name, icon: Icon }) => (
              <span
                key={name}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm"
              >
                <Icon className="h-4 w-4 text-gray-400" />
                {name}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default IntegrationsStrip;
