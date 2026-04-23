import type { Metadata } from "next";
import PrivacyPolicy from "@/views/PrivacyPolicy";

export const metadata: Metadata = {
  title: "Privacy Policy — Aczen Technologies",
  description:
    "Aczen's privacy policy explains how we collect, use, store and protect your data across our financial OS products.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy — Aczen Technologies",
    description:
      "Aczen's privacy policy explains how we collect, use, store and protect your data across our financial OS products.",
    url: "/privacy",
  },
};

export default function Page() {
  return <PrivacyPolicy />;
}
