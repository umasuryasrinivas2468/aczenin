"use client";

import { useState, useEffect } from "react";
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
  const [isScrolled, setIsScrolled] = useState(false);
  const isMobile = useIsMobile();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled || isOpen ? "bg-white shadow-md" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
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

        {/* Desktop Navigation - Centered */}
        {!isMobile && (
          <nav className="flex-1 flex items-center justify-center space-x-6">
            <PlatformDropdown />
            <SolutionsDropdown />
            <NavItem label="Pricing" href="/pricing" />
            <NavItem label="Partners" href="/partners" />
            <NavItem label="Patents" href="/patent" />
            <NavItem label="About Us" href="/about" />
            <NavItem label="Blog" href="/blog" />
            <NavItem label="Docs" href="/docs" />
            <NavItem label="Security" href="https://aczen.trustshare.com/" />
            <NavItem label="Contact" href="/contacts" />
          </nav>
        )}

        {/* Get Started Button - Desktop */}
        {!isMobile && (
          <a
            href="https://cal.com/aczen-technologies-pvt-ltd-t7jdhz/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gradient-to-r from-smebank-700 to-smeteal-600 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-300 hover:scale-105"
          >
            Book a Demo
          </a>
        )}

        {/* Mobile Menu Toggle */}
        {isMobile && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-smebank-700"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        )}
      </div>

      {/* Mobile Menu */}
      {isMobile && isOpen && (
        <div className="md:hidden bg-white">
          <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
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
              href="https://app.aczen.tech/"
              target="_blank"
              rel="noopener noreferrer"
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
  const className = `font-medium transition-colors ${
    mobile
      ? "block py-2 text-smebank-700"
      : "text-gray-700 hover:text-smebank-600"
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
      <DropdownMenuTrigger className="flex items-center font-medium text-gray-700 hover:text-smebank-600 transition-colors">
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
      <DropdownMenuTrigger className="flex items-center font-medium text-gray-700 hover:text-smebank-600 transition-colors">
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
        className="flex items-center justify-between w-full py-2 text-smebank-700 font-medium"
      >
        Platform
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="pl-4 space-y-2">
          <Link href="/accounting-software" className="block py-1 text-sm text-gray-600 hover:text-smebank-600">
            Accounting Software
          </Link>
          <Link href="/b2b-payments" className="block py-1 text-sm text-gray-600 hover:text-smebank-600">
            B2B Payments
          </Link>
          <Link href="/gst-compliance-software" className="block py-1 text-sm text-gray-600 hover:text-smebank-600">
            GST Compliance Software
          </Link>
          <Link href="/business-banking" className="block py-1 text-sm text-gray-600 hover:text-smebank-600">
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
        className="flex items-center justify-between w-full py-2 text-smebank-700 font-medium"
      >
        Solutions
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="pl-4 space-y-2">
          <Link href="/solutions/smes" className="block py-1 text-sm text-gray-600 hover:text-smebank-600">
            SME's
          </Link>
          <Link href="/solutions/ca" className="block py-1 text-sm text-gray-600 hover:text-smebank-600">
            CA
          </Link>
          <Link href="/solutions/startups" className="block py-1 text-sm text-gray-600 hover:text-smebank-600">
            Startups
          </Link>
          <Link href="/solutions/enterprises" className="block py-1 text-sm text-gray-600 hover:text-smebank-600">
            Enterprises
          </Link>
          <Link href="/solutions/freelancers" className="block py-1 text-sm text-gray-600 hover:text-smebank-600">
            Freelancers
          </Link>
        </div>
      )}
    </div>
  );
};

export default Navbar;
