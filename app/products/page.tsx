import type { Metadata } from "next";
import Products from "@/views/Products";

export const metadata: Metadata = {
  title: "Aczen Products — CRM, IDE, OS & Orbit for Indian Businesses",
  description:
    "Explore the Aczen product suite: Aczen CRM, Aczen IDE, Aczen OS and Aczen Orbit — built to run accounting, payments, compliance and customer workflows end to end.",
  keywords:
    "Aczen products, Aczen CRM, Aczen IDE, Aczen OS, Aczen Orbit, business software India, accounting platform, CRM for SMEs",
  alternates: { canonical: "/products" },
  openGraph: {
    title: "Aczen Products — CRM, IDE, OS & Orbit for Indian Businesses",
    description:
      "Explore the Aczen product suite: Aczen CRM, Aczen IDE, Aczen OS and Aczen Orbit — built to run accounting, payments, compliance and customer workflows end to end.",
    url: "/products",
  },
};

export default function Page() {
  return <Products />;
}
