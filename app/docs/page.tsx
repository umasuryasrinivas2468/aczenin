import type { Metadata } from "next";
import Docs from "@/views/Docs";

export const metadata: Metadata = {
  title: "Aczen Documentation — Developer & Product Docs",
  description:
    "Browse Aczen's product and API documentation: integrations, GST invoicing, B2B payments, accounting endpoints, and onboarding guides.",
  keywords:
    "Aczen docs, Aczen documentation, Aczen API, developer docs, integration guide",
  alternates: { canonical: "/docs" },
  openGraph: {
    title: "Aczen Documentation",
    description:
      "Product and API documentation for Aczen's unified financial OS.",
    url: "/docs",
  },
};

export default function Page() {
  return <Docs />;
}
