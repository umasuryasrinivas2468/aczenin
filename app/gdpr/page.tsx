import type { Metadata } from "next";
import GDPR from "@/views/GDPR";

export const metadata: Metadata = {
  title: "GDPR Compliance — Aczen Technologies",
  description:
    "Aczen's GDPR statement explains the rights of data subjects, our lawful bases for processing, and how to exercise your data protection rights.",
  alternates: { canonical: "/gdpr" },
  openGraph: {
    title: "GDPR Compliance — Aczen Technologies",
    description:
      "Aczen's GDPR statement explains the rights of data subjects, our lawful bases for processing, and how to exercise your data protection rights.",
    url: "/gdpr",
  },
};

export default function Page() {
  return <GDPR />;
}
