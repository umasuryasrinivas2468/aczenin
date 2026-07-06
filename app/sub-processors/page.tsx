import type { Metadata } from "next";
import SubProcessors from "@/views/SubProcessors";

export const metadata: Metadata = {
  title: "Sub-processors — Aczen Technologies",
  description:
    "The list of third-party sub-processors and infrastructure Aczen uses to deliver its services, including their purpose and location.",
  alternates: { canonical: "/sub-processors" },
  openGraph: {
    title: "Sub-processors — Aczen Technologies",
    description:
      "The list of third-party sub-processors and infrastructure Aczen uses to deliver its services, including their purpose and location.",
    url: "/sub-processors",
  },
};

export default function Page() {
  return <SubProcessors />;
}
