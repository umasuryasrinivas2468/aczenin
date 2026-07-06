import type { Metadata } from "next";
import CookiePolicy from "@/views/CookiePolicy";

export const metadata: Metadata = {
  title: "Cookie Policy — Aczen Technologies",
  description:
    "Learn how Aczen uses cookies and similar technologies, the categories of cookies we set, and how you can manage your preferences.",
  alternates: { canonical: "/cookies" },
  openGraph: {
    title: "Cookie Policy — Aczen Technologies",
    description:
      "Learn how Aczen uses cookies and similar technologies, the categories of cookies we set, and how you can manage your preferences.",
    url: "/cookies",
  },
};

export default function Page() {
  return <CookiePolicy />;
}
