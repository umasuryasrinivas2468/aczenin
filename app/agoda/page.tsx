import type { Metadata } from "next";
import Agoda from "@/views/Agoda";

export const metadata: Metadata = {
  title: "Aczen x Agoda",
  description: "Aczen x Agoda — partnership page.",
  alternates: { canonical: "/agoda" },
  robots: { index: false, follow: false },
};

export default function Page() {
  return <Agoda />;
}
