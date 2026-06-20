import type { Metadata } from "next";
import Status from "@/views/Status";

export const metadata: Metadata = {
  title: "Aczen Status — System Uptime & Incident Reports",
  description:
    "Real-time status of Aczen platform services, incidents and scheduled maintenance.",
  keywords: "Aczen status, Aczen uptime, system status fintech",
  alternates: { canonical: "/status" },
  openGraph: {
    title: "Aczen Status — System Uptime & Incident Reports",
    description:
      "Real-time status of Aczen platform services, incidents and scheduled maintenance.",
    url: "/status",
  },
};

export default function Page() {
  return <Status />;
}
