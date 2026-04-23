import type { Metadata } from "next";
import SocialImpact from "@/views/SocialImpact";

export const metadata: Metadata = {
  title: "Aczen Social Impact — Women Safety, Education & Community",
  description:
    "Aczen's social impact initiatives — women safety, digital literacy, financial inclusion, and community-driven programs across India.",
  keywords:
    "Aczen social impact, CSR fintech India, women safety program, financial inclusion India, digital literacy",
  alternates: { canonical: "/social-impact" },
  openGraph: {
    title: "Aczen Social Impact — Women Safety, Education & Community",
    description:
      "Aczen's social impact initiatives — women safety, digital literacy, financial inclusion, and community-driven programs across India.",
    url: "/social-impact",
  },
};

export default function Page() {
  return <SocialImpact />;
}
