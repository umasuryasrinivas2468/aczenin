import type { Metadata } from "next";
import Help from "@/views/Help";

export const metadata: Metadata = {
  title: "Aczen Help Center — Tutorials, Guides & Support",
  description:
    "Get help with Aczen — video tutorials, product guides, and live support for accounting, GST, payments and CRM.",
  keywords: "Aczen help, Aczen tutorials, accounting software help, Aczen guide, GST help",
  alternates: { canonical: "/help" },
  openGraph: {
    title: "Aczen Help Center — Tutorials, Guides & Support",
    description:
      "Get help with Aczen — video tutorials, product guides, and live support for accounting, GST, payments and CRM.",
    url: "/help",
  },
};

export default function Page() {
  return <Help />;
}
