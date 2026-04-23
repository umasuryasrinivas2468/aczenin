import type { Metadata } from "next";
import AczenCRM from "@/views/products/AczenCRM";

export const metadata: Metadata = {
  title: "Aczen CRM — Customer Relationship Management for Indian Businesses",
  description:
    "Aczen CRM helps SMEs manage contacts, sales pipeline, analytics and customer communications — integrated with invoicing and payments.",
  keywords:
    "Aczen CRM, CRM software India, sales pipeline tool, contact management, CRM for SMEs, lead management",
  alternates: { canonical: "/products/aczen-crm" },
  openGraph: {
    title: "Aczen CRM — Customer Relationship Management for Indian Businesses",
    description:
      "Aczen CRM helps SMEs manage contacts, sales pipeline, analytics and customer communications — integrated with invoicing and payments.",
    url: "/products/aczen-crm",
  },
};

export default function Page() {
  return <AczenCRM />;
}
