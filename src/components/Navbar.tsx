"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed top-4 inset-x-0 z-50 px-4">
      <div
        className={`container mx-auto max-w-6xl flex items-center justify-between rounded-full border px-4 py-2.5 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 border-gray-100 shadow-soft backdrop-blur-xl"
            : "bg-white/70 border-white/60 shadow-none backdrop-blur-xl"
        }`}
      >
        <Link href="/" className="flex items-center gap-2 pl-1" aria-label="Aczen home">
          <img
            src="/images/aczenimg.jpeg"
            alt="Aczen logo"
            width={32}
            height={32}
            className="h-8 w-8 rounded-md object-cover"
          />
          <span className="text-xl font-bold bg-gradient-to-r from-smebank-700 to-smeteal-600 text-transparent bg-clip-text">
            Aczen
          </span>
        </Link>

        {/* Desktop Navigation - Centered */}
        {!isMobile && (
          <nav className="flex-1 flex items-center justify-center space-x-6">
            <PlatformDropdown />
            <SolutionsDropdown />
            <NavItem label="Pricing" href="/pricing" />
            <NavItem label="Partners" href="/partners" />
            <NavItem label="About Us" href="/about" />
            <NavItem label="Blog" href="/blog" />
            <NavItem label="Docs" href="/docs" />
            <NavItem label="Contact" href="/contacts" />
          </nav>
        )}

        {/* Auth Buttons - Desktop */}
        {!isMobile && (
          <div className="flex items-center gap-2">
            <a
              href="https://dashboard.aczen.in/login"
              className="text-gray-600 text-sm font-medium px-3 py-2 hover:text-gray-900 transition-colors"
            >
              Login
            </a>
            <a
              href="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ2Vf659Nu3Ni3wVnJnBvHW3wOqnF9sDiZLKmIRvip2cH_qWGZWuDoGrSibH4wEBadGDdqgUoZBJ"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-gray-200 text-gray-700 text-sm px-5 py-2 rounded-full font-medium hover:bg-gray-50 transition-all duration-300"
            >
              Book a Demo
            </a>
            <a href="https://dashboard.aczen.in/signup" className="cta-pill-dark">
              Get Started
            </a>
          </div>
        )}

        {/* Mobile Menu Toggle */}
        {isMobile && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-gray-700"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        )}
      </div>

      {/* Mobile Menu */}
      {isMobile && isOpen && (
        <div className="md:hidden container mx-auto max-w-6xl mt-2">
          <div className="surface-card px-4 py-4 flex flex-col space-y-4">
            <MobilePlatformMenu />
            <MobileSolutionsMenu />
            <NavItem mobile label="Pricing" href="/pricing" />
            <NavItem mobile label="Partners" href="/partners" />
            <NavItem mobile label="Patents" href="/patent" />
            <NavItem mobile label="Security" href="https://aczen.trustshare.com/" />
            <NavItem mobile label="About Us" href="/about" />
            <NavItem mobile label="Blog" href="/blog" />
            <NavItem mobile label="Docs" href="/docs" />
            <NavItem mobile label="FAQ" href="/faq" />
            <NavItem mobile label="Contact" href="/contacts" />
            <a
              href="https://dashboard.aczen.in/login"
              className="border border-gray-200 text-gray-700 px-6 py-3 rounded-full font-medium text-center hover:bg-gray-50 transition-all duration-300"
            >
              Login
            </a>
            <a href="https://dashboard.aczen.in/signup" className="cta-pill-dark w-full">
              Get Started
            </a>
          </div>
        </div>
      )}
    </header>
  );
};

// Navigation Item Component
const NavItem = ({
  label,
  href,
  mobile = false,
}: {
  label: string;
  href: string;
  mobile?: boolean;
}) => {
  const isInternalLink = href.startsWith('/');
  const className = `text-sm font-medium transition-colors ${
    mobile
      ? "block py-2 text-gray-700"
      : "text-gray-600 hover:text-gray-900"
  }`;

  if (isInternalLink) {
    return (
      <Link href={href} className={className}>
        {label}
      </Link>
    );
  }

  return (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  );
};

// Platform Dropdown Component (SEO landing pages)
const PlatformDropdown = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
        Platform
        <ChevronDown className="ml-1 h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-64">
        <DropdownMenuItem asChild>
          <Link href="/accounting-software" className="w-full cursor-pointer">
            Accounting Software
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/b2b-payments" className="w-full cursor-pointer">
            B2B Payments
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/gst-compliance-software" className="w-full cursor-pointer">
            GST Compliance Software
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/business-banking" className="w-full cursor-pointer">
            Business Banking
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Solutions Dropdown Component
const SolutionsDropdown = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
        Solutions
        <ChevronDown className="ml-1 h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-48">
        <DropdownMenuItem asChild>
          <Link href="/solutions/smes" className="w-full cursor-pointer">
            SME's
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/solutions/ca" className="w-full cursor-pointer">
            CA
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/solutions/startups" className="w-full cursor-pointer">
            Startups
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/solutions/enterprises" className="w-full cursor-pointer">
            Enterprises
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/solutions/freelancers" className="w-full cursor-pointer">
            Freelancers
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Mobile Platform Menu Component
const MobilePlatformMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-2 text-gray-700 font-medium"
      >
        Platform
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="pl-4 space-y-2">
          <Link href="/accounting-software" className="block py-1 text-sm text-gray-500 hover:text-gray-900">
            Accounting Software
          </Link>
          <Link href="/b2b-payments" className="block py-1 text-sm text-gray-500 hover:text-gray-900">
            B2B Payments
          </Link>
          <Link href="/gst-compliance-software" className="block py-1 text-sm text-gray-500 hover:text-gray-900">
            GST Compliance Software
          </Link>
          <Link href="/business-banking" className="block py-1 text-sm text-gray-500 hover:text-gray-900">
            Business Banking
          </Link>
        </div>
      )}
    </div>
  );
};

// Mobile Solutions Menu Component
const MobileSolutionsMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-2 text-gray-700 font-medium"
      >
        Solutions
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="pl-4 space-y-2">
          <Link href="/solutions/smes" className="block py-1 text-sm text-gray-500 hover:text-gray-900">
            SME's
          </Link>
          <Link href="/solutions/ca" className="block py-1 text-sm text-gray-500 hover:text-gray-900">
            CA
          </Link>
          <Link href="/solutions/startups" className="block py-1 text-sm text-gray-500 hover:text-gray-900">
            Startups
          </Link>
          <Link href="/solutions/enterprises" className="block py-1 text-sm text-gray-500 hover:text-gray-900">
            Enterprises
          </Link>
          <Link href="/solutions/freelancers" className="block py-1 text-sm text-gray-500 hover:text-gray-900">
            Freelancers
          </Link>
        </div>
      )}
    </div>
  );
};

export default Navbar;
