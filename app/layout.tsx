import type { Metadata, Viewport } from "next";
import Script from "next/script";
import Providers from "./providers";
import "./globals.css";

const SITE_URL = "https://aczen.in";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Aczen — Unified Financial OS for SMEs, CAs, Startups & Enterprises in India",
    template: "%s | Aczen",
  },
  description:
    "Aczen is India's unified financial operating system — GST invoicing, expense management, B2B payments, accounting, compliance and CRM in one platform. Bank smarter. Scale faster.",
  keywords: [
    "Aczen",
    "Aczen Technologies",
    "unified financial OS",
    "accounting software India",
    "GST invoicing software",
    "expense management",
    "B2B payments",
    "SME accounting",
    "CA software",
    "startup accounting",
    "freelancer invoicing",
    "bookkeeping software",
    "Aczen CRM",
    "Aczen OS",
    "Aczen IDE",
    "Aczen Orbit",
    "TDS compliance",
    "e-invoicing India",
    "financial automation",
    "fintech India",
  ],
  authors: [{ name: "Aczen Technologies Pvt Ltd" }],
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  alternates: { canonical: "/" },
  openGraph: {
    title: "Aczen — Unified Financial OS for India's Businesses",
    description:
      "GST invoicing, expense management, B2B payments, accounting, compliance and CRM — all in one platform. Bank smarter. Scale faster.",
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: "Aczen",
    images: [`${SITE_URL}/images/aczenimg.jpeg`],
  },
  twitter: {
    card: "summary_large_image",
    site: "@aczen",
    images: [`${SITE_URL}/images/aczenimg.jpeg`],
  },
  icons: {
    icon: [{ url: "/images/aczenimg.jpeg", type: "image/jpeg" }],
    apple: "/images/aczenimg.jpeg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Aczen Technologies Pvt Ltd",
  alternateName: "Aczen",
  url: "https://aczen.in",
  logo: "https://aczen.in/images/aczenimg.jpeg",
  description:
    "Aczen is India's unified financial OS — GST invoicing, expense management, B2B payments, accounting and CRM in one platform.",
  foundingDate: "2024",
  sameAs: ["https://www.linkedin.com/company/aczen", "https://x.com/aczen"],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    url: "https://aczen.in/contacts",
    areaServed: "IN",
    availableLanguage: ["English", "Hindi"],
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Aczen",
  url: "https://aczen.in",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://aczen.in/blog?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "wgbna0jyna");`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>

        <Script id="chatbase-embed" strategy="afterInteractive">
          {`(function(){if(!window.chatbase||window.chatbase("getState")!=="initialized"){window.chatbase=(...arguments)=>{if(!window.chatbase.q){window.chatbase.q=[]}window.chatbase.q.push(arguments)};window.chatbase=new Proxy(window.chatbase,{get(target,prop){if(prop==="q"){return target.q}return(...args)=>target(prop,...args)}})}const onLoad=function(){const script=document.createElement("script");script.src="https://www.chatbase.co/embed.min.js";script.id="YREz_QoD10_nSG2H8WN6Y";script.domain="www.chatbase.co";document.body.appendChild(script)};if(document.readyState==="complete"){onLoad()}else{window.addEventListener("load",onLoad)}})();`}
        </Script>
      </body>
    </html>
  );
}
