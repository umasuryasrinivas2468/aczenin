import type { Metadata } from "next";
import { Newsreader, Archivo } from "next/font/google";
import Finathon from "@/views/Finathon";
import "./finathon.css";

/*
  Route shell for /Finathon. Follows the same thin-page pattern as
  app/pricing/page.tsx: metadata here, markup in the view.

  The two typefaces are instantiated at module scope (next/font requires it) and
  exposed as CSS variables that finathon.css reads. Scoping them to this route
  rather than the root layout means the rest of aczen.in does not download two
  extra families it never uses.
*/

const newsreader = Newsreader({
  subsets: ["latin"],
  // Variable axis range: display sizes take the light end, body copy the
  // regular. One file covers both, so the extra weights cost no extra requests.
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  // swap keeps text visible in the fallback face while the webfont loads,
  // rather than blocking the first paint on it.
  display: "swap",
  variable: "--font-newsreader",
  fallback: ["ui-serif", "Georgia", "serif"],
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-archivo",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

const PAGE_TITLE = "Finathon 2026 — 36-Hour Fintech Hackathon by Aczen at MLRIT";
const PAGE_DESCRIPTION =
  "Finathon is Aczen's 36-hour hiring hackathon at MLR Institute of Technology, Hyderabad, 30 September to 1 October 2026. Four tracks: fintech, AI & ML, business systems, and cybersecurity. Open to third and fourth year students from any college in Telangana. Standout builders are offered a paid internship at Aczen.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords:
    "Finathon, Aczen hackathon, fintech hackathon India, MLRIT hackathon, Hyderabad hackathon 2026, hiring hackathon, internship hackathon, AI ML hackathon, cybersecurity hackathon, 36 hour hackathon, student hackathon India",
  alternates: { canonical: "/Finathon" },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: "/Finathon",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

/*
  Event structured data. This is what makes Google show the dates, venue and
  status directly in search results, and it is what Google's event listings
  read from — worth more than any keyword on a page like this.
*/
const eventJsonLd = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: "Finathon 2026",
  description: PAGE_DESCRIPTION,
  // ISO instants carry the +05:30 offset so the listing is not shifted for
  // searchers outside India.
  startDate: "2026-09-30T08:00:00+05:30",
  endDate: "2026-10-01T20:00:00+05:30",
  eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  location: {
    "@type": "Place",
    name: "MLR Institute of Technology",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Laxman Reddy Avenue, Dundigal",
      addressLocality: "Hyderabad",
      addressRegion: "Telangana",
      postalCode: "500043",
      addressCountry: "IN",
    },
  },
  organizer: {
    "@type": "Organization",
    name: "Aczen Technologies Pvt Ltd",
    url: "https://aczen.in",
  },
  url: "https://aczen.in/Finathon",
};

export default function Page() {
  return (
    // The font variables are bound here rather than on <body> so they exist for
    // this subtree only. finathon.css resolves them through var(--font-*).
    <div className={`${newsreader.variable} ${archivo.variable}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
      />
      <Finathon />
    </div>
  );
}
