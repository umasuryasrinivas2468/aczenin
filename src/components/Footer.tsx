"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Instagram,
  Linkedin,
  Twitter,
  ArrowRight,
  Check,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import {
  TextHoverEffect,
  FooterBackgroundGradient,
} from "@/components/ui/hover-footer";
import CookieConsent from "@/components/CookieConsent";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://images.dmca.com/Badges/DMCABadgeHelper.min.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const footerLinks = [
    {
      title: "Platform",
      links: [
        { name: "Accounting Software", href: "/accounting-software" },
        { name: "B2B Payments", href: "/b2b-payments" },
        { name: "GST Compliance Software", href: "/gst-compliance-software" },
        { name: "Business Banking", href: "/business-banking" },
        { name: "Pricing", href: "/pricing" },
      ],
    },
    {
      title: "Company",
      links: [
        { name: "About Us", href: "/about" },
        { name: "Our Story", href: "/our-story" },
        { name: "Careers", href: "https://tally.so/r/3XB2PO" },
        { name: "Blog", href: "/blog" },
        { name: "Partners", href: "/partners" },
        { name: "Contact", href: "/contacts" },
      ],
    },
    {
      title: "Legal",
      links: [
        { name: "Privacy Policy", href: "/privacy" },
        { name: "Terms of Service", href: "/terms" },
        { name: "Cookie Policy", href: "/cookies" },
        { name: "Sub-processors", href: "/sub-processors" },
        { name: "Security", href: "/security" },
        { name: "GDPR", href: "/gdpr" },
      ],
    },
  ];

  const socialLinks = [
    {
      name: "Instagram",
      href: "https://www.instagram.com/aczen_org/",
      icon: Instagram,
    },
    {
      name: "LinkedIn",
      href: "https://www.linkedin.com/company/aczen/",
      icon: Linkedin,
    },
    { name: "Twitter", href: "#", icon: Twitter },
  ];

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail("");
  };

  const openCookiePreferences = () => {
    window.dispatchEvent(new Event("open-cookie-consent"));
  };

  return (
    <>
      <footer className="relative m-4 md:m-8 h-fit overflow-hidden rounded-3xl border border-smebank-100 bg-white/70 text-gray-600 shadow-[0_18px_50px_-24px_rgba(46,119,255,0.25)]">
        <div className="relative z-40 mx-auto max-w-7xl p-8 md:p-14">
          {/* Newsletter band */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="mb-12 grid grid-cols-1 items-center gap-6 rounded-2xl border border-smebank-100 bg-gradient-to-r from-smebank-50 via-smebank-50/60 to-white p-6 md:grid-cols-2 md:p-8"
          >
            <div>
              <h3 className="text-xl font-bold text-gray-900 md:text-2xl">
                Stay in the loop
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Product updates, compliance changes and finance tips — no spam.
              </p>
            </div>
            <form onSubmit={handleSubscribe} className="flex w-full items-center gap-2">
              {subscribed ? (
                <div className="flex w-full items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  <Check className="h-4 w-4" strokeWidth={3} />
                  You're subscribed. Welcome aboard!
                </div>
              ) : (
                <>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition-colors focus:border-smebank-300 focus:ring-2 focus:ring-smebank-100"
                  />
                  <button
                    type="submit"
                    aria-label="Subscribe"
                    className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-smebank-700 to-smeteal-600 px-5 py-3 text-sm font-medium text-white transition-all hover:shadow-lg hover:scale-[1.02]"
                  >
                    Subscribe
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              )}
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="grid grid-cols-1 gap-10 pb-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-16"
          >
            {/* Brand section */}
            <div className="flex flex-col space-y-4">
              <Link href="/" className="flex items-center gap-2" aria-label="Aczen home">
                <img
                  src="/images/aczenimg.jpeg"
                  alt="Aczen logo"
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-md object-cover"
                />
                <span className="text-2xl font-bold bg-gradient-to-r from-smebank-700 to-smeteal-600 text-transparent bg-clip-text">
                  Aczen
                </span>
              </Link>
              <p className="text-sm leading-relaxed text-gray-500">
                Empowering India's small businesses with modern banking solutions
                designed for growth.
              </p>

              {/* Contact details */}
              <ul className="space-y-3 pt-1">
                <li className="flex items-center gap-3 text-sm">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-smebank-100 text-smebank-600">
                    <Phone className="h-4 w-4" />
                  </span>
                  <a
                    href="tel:+919908754657"
                    className="text-gray-500 transition-colors hover:text-smebank-600"
                  >
                    +91 99087 54657
                  </a>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-smebank-100 text-smebank-600">
                    <Mail className="h-4 w-4" />
                  </span>
                  <a
                    href="mailto:support@aczen.in"
                    className="text-gray-500 transition-colors hover:text-smebank-600"
                  >
                    support@aczen.in
                  </a>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-smebank-100 text-smebank-600">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <span className="not-italic text-gray-500 leading-relaxed">
                    Aczen-CBR Estates, 1st Floor,
                    <br />
                    Sri Durga Colony, Hyderabad, 500081
                  </span>
                </li>
              </ul>

              <div className="flex space-x-4 pt-1">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.name}
                      href={social.href}
                      className="text-gray-400 transition-colors hover:text-smebank-600"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="sr-only">{social.name}</span>
                      <Icon className="h-5 w-5" />
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Footer link sections */}
            {footerLinks.map((column) => (
              <div key={column.title}>
                <h4 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-900">
                  {column.title}
                </h4>
                <ul className="space-y-3">
                  {column.links.map((link) => (
                    <li key={link.name}>
                      <a
                        href={link.href}
                        className="text-sm text-gray-500 transition-colors hover:text-smebank-600"
                        target={link.href.startsWith("http") ? "_blank" : undefined}
                        rel={
                          link.href.startsWith("http")
                            ? "noopener noreferrer"
                            : undefined
                        }
                      >
                        {link.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </motion.div>

          <hr className="my-8 border-t border-smebank-100" />

          {/* Footer bottom */}
          <div className="flex flex-col items-center justify-between gap-4 text-sm md:flex-row">
            <div className="flex flex-col items-center gap-2 md:flex-row md:gap-4">
              <p className="text-gray-500">
                &copy; {currentYear} Aczen. All rights reserved.
              </p>
              <span className="hidden text-gray-300 md:inline">·</span>
              <span className="text-gray-400">Aczen Technologies Private Limited</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-gray-500">
              <Link href="/privacy" className="transition-colors hover:text-smebank-600">
                Privacy
              </Link>
              <Link href="/terms" className="transition-colors hover:text-smebank-600">
                Terms
              </Link>
              <Link href="/cookies" className="transition-colors hover:text-smebank-600">
                Cookies
              </Link>
              <button
                type="button"
                onClick={openCookiePreferences}
                className="transition-colors hover:text-smebank-600"
              >
                Cookie Preferences
              </button>
              <a
                href="//www.dmca.com/Protection/Status.aspx?ID=90f39a87-413e-4014-8582-665d422b6871"
                title="DMCA.com Protection Status"
                className="dmca-badge"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src="https://images.dmca.com/Badges/dmca-badge-w100-2x1-02.png?ID=90f39a87-413e-4014-8582-665d422b6871"
                  alt="DMCA.com Protection Status"
                  className="h-6"
                />
              </a>
            </div>
          </div>
        </div>

        {/* Text hover effect — slanted "ACZEN" wordmark */}
        <div className="-mb-24 -mt-32 hidden h-[26rem] -skew-x-12 lg:flex">
          <TextHoverEffect text="Aczen" className="z-50" />
        </div>

        <FooterBackgroundGradient />
      </footer>

      <CookieConsent />
    </>
  );
};

export default Footer;
