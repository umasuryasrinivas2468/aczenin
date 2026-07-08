"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  ChevronDown,
  Calculator,
  CreditCard,
  ShieldCheck,
  Landmark,
  ReceiptText,
  LineChart,
  Sparkles,
  Building2,
  Rocket,
  Users,
  Briefcase,
  Wallet,
  Handshake,
  Newspaper,
  Award,
  Mail,
  BookOpen,
  Megaphone,
  Settings,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

/* ---------- mega-menu data ---------- */
type MegaItem = {
  icon: LucideIcon;
  title: string;
  description?: string;
  href: string;
};

const solutionsMain: MegaItem[] = [
  {
    icon: Calculator,
    title: "Accounting Software",
    description: "Automate your books end to end",
    href: "/accounting-software",
  },
  {
    icon: CreditCard,
    title: "B2B Payments",
    description: "Pay vendors via NEFT, RTGS & IMPS",
    href: "/b2b-payments",
  },
  {
    icon: ShieldCheck,
    title: "GST Compliance",
    description: "File GSTR-1, 3B & 9 automatically",
    href: "/gst-compliance-software",
  },
  {
    icon: Landmark,
    title: "Business Banking",
    description: "Banking built for growing SMEs",
    href: "/business-banking",
  },
  {
    icon: ReceiptText,
    title: "Expense Management",
    description: "Track & control company spend",
    href: "/expense-management",
  },
  {
    icon: LineChart,
    title: "Cash Flow Insights",
    description: "Forecast inflow & outflow",
    href: "/cash-flow-insights",
  },
  {
    icon: Sparkles,
    title: "Agentic AI",
    description: "Prompt-driven finance automation",
    href: "/agentic-ai",
  },
];

const byFunction: MegaItem[] = [
  { icon: Calculator, title: "Accounting", href: "/accounting-software" },
  { icon: Wallet, title: "Finance", href: "/solutions/finance" },
  { icon: Megaphone, title: "Sales & Marketing", href: "/solutions/sales-marketing" },
  { icon: Users, title: "Human Resources", href: "/solutions/human-resources" },
  { icon: Settings, title: "Operations & Admin", href: "/solutions/operations-admin" },
  { icon: ShoppingCart, title: "Procurement", href: "/solutions/procurement" },
  { icon: ShieldCheck, title: "Compliance & Tax", href: "/gst-compliance-software" },
  { icon: Briefcase, title: "Chartered Accountants", href: "/solutions/ca" },
];

const byBusinessType: MegaItem[] = [
  { icon: Briefcase, title: "CA", href: "/solutions/ca" },
  { icon: Rocket, title: "Startups", href: "/solutions/startups" },
  { icon: Building2, title: "SME's", href: "/solutions/smes" },
  { icon: Landmark, title: "Enterprises", href: "/solutions/enterprises" },
  { icon: Users, title: "Freelancers", href: "/solutions/freelancers" },
];

const companyMain: MegaItem[] = [
  {
    icon: Building2,
    title: "About Us",
    description: "Our mission, team & values",
    href: "/about",
  },
  {
    icon: BookOpen,
    title: "Our Story",
    description: "How Aczen came to be",
    href: "/our-story",
  },
  {
    icon: Award,
    title: "Patents",
    description: "Our filed innovations",
    href: "/patent",
  },
  {
    icon: Newspaper,
    title: "Blog",
    description: "Product news & finance tips",
    href: "/blog",
  },
  {
    icon: Handshake,
    title: "Partners",
    description: "Grow with the Aczen network",
    href: "/partners",
  },
  {
    icon: Briefcase,
    title: "Careers",
    description: "Build the future of finance",
    href: "https://tally.so/r/3XB2PO",
  },
  {
    icon: Mail,
    title: "Contact",
    description: "Talk to our team",
    href: "/contacts",
  },
];

// Flat lists used by the mobile accordions.
const companyLinks = companyMain.map(({ title, href }) => ({ name: title, href }));

type MegaKey = "solutions" | "company";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeMega, setActiveMega] = useState<MegaKey | null>(null);
  const isMobile = useIsMobile();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMega = () => setActiveMega(null);

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled || isOpen || activeMega ? "bg-white shadow-md" : "bg-transparent"
      }`}
    >
      <div className="relative" onMouseLeave={closeMega}>
        <div className="container relative mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="Aczen home"
            onMouseEnter={closeMega}
          >
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

          {/* Desktop Navigation - Centered */}
          {!isMobile && (
            <nav className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center space-x-8">
              <MegaTrigger
                label="Solutions"
                active={activeMega === "solutions"}
                onHover={() => setActiveMega("solutions")}
              />
              <NavItem label="Pricing" href="/pricing" onHover={closeMega} />
              <NavItem
                label="Security"
                href="https://aczen.trustshare.com/"
                onHover={closeMega}
              />
              <MegaTrigger
                label="Company"
                active={activeMega === "company"}
                onHover={() => setActiveMega("company")}
              />
            </nav>
          )}

          {/* Auth Buttons - Desktop */}
          {!isMobile && (
            <div className="flex items-center gap-3" onMouseEnter={closeMega}>
              <a
                href="https://dashboard.aczen.in/signup"
                className="bg-gradient-to-r from-smebank-700 to-smeteal-600 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                Get Started
              </a>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          {isMobile && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden text-smebank-700"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          )}
        </div>

        {/* Mega Menus */}
        <AnimatePresence>
          {!isMobile && activeMega === "solutions" && (
            <MegaPanel key="solutions-panel">
              <SolutionsMegaMenu onNavigate={closeMega} />
            </MegaPanel>
          )}
          {!isMobile && activeMega === "company" && (
            <MegaPanel key="company-panel">
              <CompanyMegaMenu onNavigate={closeMega} />
            </MegaPanel>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Menu */}
      {isMobile && isOpen && (
        <div className="md:hidden bg-white">
          <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
            <MobileSolutionsMenu />
            <NavItem mobile label="Pricing" href="/pricing" />
            <NavItem mobile label="Security" href="https://aczen.trustshare.com/" />
            <MobileCompanyMenu />
            <NavItem mobile label="FAQ" href="/faq" />
            <a
              href="https://dashboard.aczen.in/signup"
              className="bg-gradient-to-r from-smebank-700 to-smeteal-600 text-white px-6 py-3 rounded-lg font-medium text-center hover:shadow-lg transition-all duration-300"
            >
              Get Started
            </a>
          </div>
        </div>
      )}
    </header>
  );
};

/* ---------- Mega trigger + panel shell ---------- */
const MegaTrigger = ({
  label,
  active,
  onHover,
}: {
  label: string;
  active: boolean;
  onHover: () => void;
}) => (
  <button
    type="button"
    onMouseEnter={onHover}
    className={`flex items-center font-medium transition-colors ${
      active ? "text-smebank-600" : "text-gray-700 hover:text-smebank-600"
    }`}
  >
    {label}
    <ChevronDown
      className={`ml-1 h-4 w-4 transition-transform ${active ? "rotate-180" : ""}`}
    />
  </button>
);

const MegaPanel = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: -8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.2, ease: "easeOut" }}
    className="absolute left-0 top-full w-full"
  >
    <div className="bg-white border-t border-gray-100 shadow-[0_24px_60px_-24px_rgba(46,119,255,0.35)]">
      <div className="container mx-auto px-6 py-8">{children}</div>
    </div>
  </motion.div>
);

/* ---------- shared mega pieces ---------- */
const MegaColumnTitle = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 mb-4 pb-3 border-b border-gray-100">
    {children}
  </p>
);

const MegaLink = ({
  item,
  compact = false,
  onNavigate,
}: {
  item: MegaItem;
  compact?: boolean;
  onNavigate: () => void;
}) => {
  const Icon = item.icon;
  const external = item.href.startsWith("http");
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="group flex items-start gap-3 rounded-xl p-2 -mx-2 transition-colors hover:bg-smebank-50"
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors group-hover:border-smebank-200 group-hover:text-smebank-600">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
      </span>
      <span>
        <span className="block text-sm font-semibold text-gray-900 group-hover:text-smebank-700">
          {item.title}
        </span>
        {!compact && item.description && (
          <span className="block text-xs text-gray-400">{item.description}</span>
        )}
      </span>
    </Link>
  );
};

/* ---------- Solutions Mega Menu ---------- */
const SolutionsMegaMenu = ({ onNavigate }: { onNavigate: () => void }) => (
  <>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      {/* Solutions grid */}
      <div className="lg:col-span-8">
        <MegaColumnTitle>Solutions</MegaColumnTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-1">
          {solutionsMain.map((item) => (
            <MegaLink key={item.title} item={item} onNavigate={onNavigate} />
          ))}
        </div>
      </div>

      {/* By function */}
      <div className="lg:col-span-4">
        <MegaColumnTitle>By Function</MegaColumnTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
          {byFunction.map((item) => (
            <MegaLink key={item.title} item={item} compact onNavigate={onNavigate} />
          ))}
        </div>
      </div>
    </div>

    {/* Business types — centered strip */}
    <div className="mt-6 pt-5 border-t border-gray-100 flex flex-wrap items-center justify-center gap-2.5">
      <span className="text-xs font-medium text-gray-400 mr-1">
        Explore by business type
      </span>
      {byBusinessType.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.title}
            href={item.href}
            onClick={onNavigate}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-smebank-200 hover:bg-smebank-50 hover:text-smebank-700"
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
            {item.title}
          </Link>
        );
      })}
    </div>
  </>
);

/* ---------- Company Mega Menu (same UI as Solutions) ---------- */
const CompanyMegaMenu = ({ onNavigate }: { onNavigate: () => void }) => (
  <div>
    <MegaColumnTitle>Company</MegaColumnTitle>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-1">
      {companyMain.map((item) => (
        <MegaLink key={item.title} item={item} onNavigate={onNavigate} />
      ))}
    </div>
  </div>
);

/* ---------- Navigation Item Component ---------- */
const NavItem = ({
  label,
  href,
  mobile = false,
  onHover,
}: {
  label: string;
  href: string;
  mobile?: boolean;
  onHover?: () => void;
}) => {
  const isInternalLink = href.startsWith("/");
  const className = `font-medium transition-colors ${
    mobile ? "block py-2 text-smebank-700" : "text-gray-700 hover:text-smebank-600"
  }`;

  if (isInternalLink) {
    return (
      <Link href={href} className={className} onMouseEnter={onHover}>
        {label}
      </Link>
    );
  }

  return (
    <a
      href={href}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={onHover}
    >
      {label}
    </a>
  );
};

/* ---------- Mobile Solutions Menu ---------- */
const MobileSolutionsMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-2 text-smebank-700 font-medium"
      >
        Solutions
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="pl-4 space-y-2">
          {[...solutionsMain, ...byBusinessType].map((item) => (
            <Link
              key={`${item.title}-${item.href}`}
              href={item.href}
              className="block py-1 text-sm text-gray-600 hover:text-smebank-600"
            >
              {item.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

/* ---------- Mobile Company Menu ---------- */
const MobileCompanyMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-2 text-smebank-700 font-medium"
      >
        Company
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="pl-4 space-y-2">
          {companyLinks.map((link) => {
            const external = link.href.startsWith("http");
            return (
              <Link
                key={link.name}
                href={link.href}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
                className="block py-1 text-sm text-gray-600 hover:text-smebank-600"
              >
                {link.name}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Navbar;
