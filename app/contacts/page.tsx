import type { Metadata } from "next";
import Contacts from "@/views/Contacts";

export const metadata: Metadata = {
  title: "Contact Aczen — Sales, Support & Partnerships",
  description:
    "Get in touch with Aczen for sales, product support, partnerships and press. Email, phone and office locations across India.",
  keywords:
    "contact Aczen, Aczen support, Aczen sales, Aczen partnerships, Aczen office India",
  alternates: { canonical: "/contacts" },
  openGraph: {
    title: "Contact Aczen — Sales, Support & Partnerships",
    description:
      "Get in touch with Aczen for sales, product support, partnerships and press. Email, phone and office locations across India.",
    url: "/contacts",
  },
};

export default function Page() {
  return <Contacts />;
}
