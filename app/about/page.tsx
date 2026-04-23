import type { Metadata } from "next";
import AboutUs from "@/views/AboutUs";

export const metadata: Metadata = {
  title: "About Aczen — Leadership Team & Mission",
  description:
    "Meet the Aczen leadership team and learn our mission to build India's unified financial OS for SMEs, CAs, startups and enterprises.",
  keywords:
    "About Aczen, Aczen leadership, Aczen team, Aczen founders, Uma Surya Srinivas, fintech India company",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Aczen — Leadership Team & Mission",
    description:
      "Meet the Aczen leadership team and learn our mission to build India's unified financial OS for SMEs, CAs, startups and enterprises.",
    url: "/about",
  },
};

export default function Page() {
  return <AboutUs />;
}
