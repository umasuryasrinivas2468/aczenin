import type { Metadata } from "next";
import Enterprises from "@/views/solutions/Enterprises";

export const metadata: Metadata = {
  title: "Aczen for Enterprises — Corporate Banking & Finance Automation",
  description:
    "Aczen Enterprise: multi-entity accounting, corporate banking integrations, approvals workflow, audit trails and dedicated support.",
  keywords:
    "enterprise accounting India, Aczen for enterprise, corporate banking software, multi-entity accounting, finance automation",
  alternates: { canonical: "/solutions/enterprises" },
  openGraph: {
    title: "Aczen for Enterprises — Corporate Banking & Finance Automation",
    description:
      "Aczen Enterprise: multi-entity accounting, corporate banking integrations, approvals workflow, audit trails and dedicated support.",
    url: "/solutions/enterprises",
  },
};

export default function Page() {
  return <Enterprises />;
}
