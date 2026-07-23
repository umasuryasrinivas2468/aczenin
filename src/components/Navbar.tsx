"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);

  return (
    <header className="fixed top-0 w-full z-50 bg-white border-b-2 border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="Aczen home">
          <img
            src="/images/aczenimg.jpeg"
            alt="Aczen logo"
            width={36}
            height={36}
            className="h-9 w-9 rounded-lg object-cover"
          />
          <span className="text-2xl font-bold bg-gradient-to-r from-smebank-700 to-smeteal-600 text-transparent bg-clip-text">
            Aczen
          </span>
        </Link>

        {/* Desktop Navigation - Centered */}
        <nav className="hidden lg:flex flex-1 items-center justify-center gap-1">
          <PlatformDropdown />
          <SolutionsDropdown />
          <NavItem label="Pricing" href="/pricing" />
          <NavItem label="Partners" href="/partners" />
          <NavItem label="About Us" href="/about" />
          <NavItem label="Blog" href="/blog" />
          <NavItem label="Docs" href="/docs" />
          <NavItem label="Contact" href="/contacts" />
        </nav>

        {/* Auth Buttons - Desktop */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <a
            href="https://dashboard.aczen.in/login"
            className="text-smebank-700 font-medium px-3 py-2 rounded-lg hover:text-smebank-800 hover:bg-smebank-50 transition-colors"
          >
            Login
          </a>
          <a
            href="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ2Vf659Nu3Ni3wVnJnBvHW3wOqnF9sDiZLKmIRvip2cH_qWGZWuDoGrSibH4wEBadGDdqgUoZBJ"
            target="_blank"
            rel="noopener noreferrer"
            className="border-2 border-slate-900 bg-white text-slate-900 px-4 py-2 font-bold uppercase tracking-wide text-sm shadow-soft hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all duration-150"
          >
            Book a Demo
          </a>
          <a
            href="https://dashboard.aczen.in/signup"
            className="border-2 border-slate-900 bg-smebank-500 text-white px-5 py-2 font-bold uppercase tracking-wide text-sm shadow-soft hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all duration-150"
          >
            Get Started
          </a>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
          className="lg:hidden text-smebank-700 p-2 -mr-2 rounded-lg hover:bg-smebank-50 transition-colors"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden bg-white border-t border-black/[0.06] max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col space-y-1">
            <MobilePlatformMenu onNavigate={close} />
            <MobileSolutionsMenu onNavigate={close} />
            <NavItem mobile label="Pricing" href="/pricing" onNavigate={close} />
            <NavItem mobile label="Partners" href="/partners" onNavigate={close} />
            <NavItem mobile label="About Us" href="/about" onNavigate={close} />
            <NavItem mobile label="Blog" href="/blog" onNavigate={close} />
            <NavItem mobile label="Docs" href="/docs" onNavigate={close} />
            <NavItem mobile label="Contact" href="/contacts" onNavigate={close} />
            <div className="flex flex-col gap-2 pt-3 mt-2 border-t border-black/[0.06]">
              <a
                href="https://dashboard.aczen.in/login"
                className="border-2 border-slate-900 bg-white text-slate-900 px-6 py-3 font-bold uppercase tracking-wide text-center shadow-soft transition-all duration-150"
              >
                Login
              </a>
              <a
                href="https://dashboard.aczen.in/signup"
                className="border-2 border-slate-900 bg-smebank-500 text-white px-6 py-3 font-bold uppercase tracking-wide text-center shadow-soft transition-all duration-150"
              >
                Get Started
              </a>
            </div>
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
  onNavigate,
}: {
  label: string;
  href: string;
  mobile?: boolean;
  onNavigate?: () => void;
}) => {
  const isInternalLink = href.startsWith('/');
  const className = mobile
    ? "block py-2.5 px-2 rounded-lg font-medium text-smebank-700 hover:bg-smebank-50 transition-colors"
    : "px-3 py-2 rounded-lg font-medium text-gray-700 hover:text-smebank-700 hover:bg-smebank-50 transition-colors";

  if (isInternalLink) {
    return (
      <Link href={href} className={className} onClick={onNavigate}>
        {label}
      </Link>
    );
  }

  return (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer" onClick={onNavigate}>
      {label}
    </a>
  );
};

// Platform Dropdown Component (SEO landing pages)
const PlatformDropdown = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center px-3 py-2 rounded-lg font-medium text-gray-700 hover:text-smebank-700 hover:bg-smebank-50 transition-colors data-[state=open]:text-smebank-700 data-[state=open]:bg-smebank-50 [&[data-state=open]_svg]:rotate-180">
        Platform
        <ChevronDown className="ml-1 h-4 w-4 transition-transform" />
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
      <DropdownMenuTrigger className="flex items-center px-3 py-2 rounded-lg font-medium text-gray-700 hover:text-smebank-700 hover:bg-smebank-50 transition-colors data-[state=open]:text-smebank-700 data-[state=open]:bg-smebank-50 [&[data-state=open]_svg]:rotate-180">
        Solutions
        <ChevronDown className="ml-1 h-4 w-4 transition-transform" />
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
const MobilePlatformMenu = ({ onNavigate }: { onNavigate?: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const linkCls =
    "block py-2 px-2 rounded-lg text-sm text-gray-600 hover:text-smebank-700 hover:bg-smebank-50";

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex items-center justify-between w-full py-2.5 px-2 rounded-lg text-smebank-700 font-medium hover:bg-smebank-50"
      >
        Platform
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="pl-3 mt-1 space-y-0.5 border-l border-smebank-100 ml-2">
          <Link href="/accounting-software" className={linkCls} onClick={onNavigate}>
            Accounting Software
          </Link>
          <Link href="/b2b-payments" className={linkCls} onClick={onNavigate}>
            B2B Payments
          </Link>
          <Link href="/gst-compliance-software" className={linkCls} onClick={onNavigate}>
            GST Compliance Software
          </Link>
          <Link href="/business-banking" className={linkCls} onClick={onNavigate}>
            Business Banking
          </Link>
        </div>
      )}
    </div>
  );
};

// Mobile Solutions Menu Component
const MobileSolutionsMenu = ({ onNavigate }: { onNavigate?: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const linkCls =
    "block py-2 px-2 rounded-lg text-sm text-gray-600 hover:text-smebank-700 hover:bg-smebank-50";

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex items-center justify-between w-full py-2.5 px-2 rounded-lg text-smebank-700 font-medium hover:bg-smebank-50"
      >
        Solutions
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="pl-3 mt-1 space-y-0.5 border-l border-smebank-100 ml-2">
          <Link href="/solutions/smes" className={linkCls} onClick={onNavigate}>
            SME's
          </Link>
          <Link href="/solutions/ca" className={linkCls} onClick={onNavigate}>
            CA
          </Link>
          <Link href="/solutions/startups" className={linkCls} onClick={onNavigate}>
            Startups
          </Link>
          <Link href="/solutions/enterprises" className={linkCls} onClick={onNavigate}>
            Enterprises
          </Link>
          <Link href="/solutions/freelancers" className={linkCls} onClick={onNavigate}>
            Freelancers
          </Link>
        </div>
      )}
    </div>
  );
};

export default Navbar;
