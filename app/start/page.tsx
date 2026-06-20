import type { Metadata } from "next";
import Start from "@/views/Start";

export const metadata: Metadata = {
  title: "Aczen Orbit — Start Your Company & Open a Business Account",
  description:
    "Launch your Pvt Ltd, LLP or OPC with Aczen Orbit. Get incorporation, PAN/TAN, GST, current account and compliance — all in one place.",
  keywords:
    "Aczen Orbit, start a company India, company incorporation online, Pvt Ltd registration, LLP registration, business current account",
  alternates: { canonical: "/start" },
  openGraph: {
    title: "Aczen Orbit — Start Your Company & Open a Business Account",
    description:
      "Launch your Pvt Ltd, LLP or OPC with Aczen Orbit. Get incorporation, PAN/TAN, GST, current account and compliance — all in one place.",
    url: "/start",
  },
};

export default function Page() {
  return <Start />;
}
