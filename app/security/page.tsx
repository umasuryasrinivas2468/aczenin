import type { Metadata } from "next";
import Security from "@/views/Security";

export const metadata: Metadata = {
  title: "Aczen Security — Bank-Grade Encryption, 2FA & Compliance",
  description:
    "Aczen protects your business data with 256-bit SSL encryption, biometric and two-factor authentication, and full compliance with Indian data standards.",
  keywords:
    "Aczen security, fintech security India, 2FA accounting, encrypted banking, RBI compliance, ISO 27001",
  alternates: { canonical: "/security" },
  openGraph: {
    title: "Aczen Security — Bank-Grade Encryption, 2FA & Compliance",
    description:
      "Aczen protects your business data with 256-bit SSL encryption, biometric and two-factor authentication, and full compliance with Indian data standards.",
    url: "/security",
  },
};

export default function Page() {
  return <Security />;
}
