import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
        <Link to="/" className="flex items-center">
          <span className="text-2xl font-bold bg-gradient-to-r from-smebank-700 to-smeteal-600 text-transparent bg-clip-text">
            Aczen
          </span>
        </Link>

        {/* Desktop Navigation - Centered */}
        {!isMobile && (
          <nav className="flex-1 flex items-center justify-center space-x-6">
            <SolutionsDropdown />
            <ProductsDropdown />
            <NavItem label="Partners" href="/partners" />
            <NavItem label="Pricing" href="/pricing" />
            <NavItem label="About Us" href="/about" />
            <NavItem label="FAQ" href="/faq" />
            <NavItem label="Contact" href="/contacts" />
          </nav>
        )}

        {/* Get Started Button - Desktop */}
        {!isMobile && (
          <a
            href="https://app.aczen.tech/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gradient-to-r from-smebank-700 to-smeteal-600 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-300 hover:scale-105"
          >
            Get Started
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
            <MobileSolutionsMenu />
            <MobileProductsMenu />
            <NavItem mobile label="Partners" href="/partners" />
            <NavItem mobile label="Pricing" href="/pricing" />
            <NavItem mobile label="About Us" href="/about" />
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
      <Link to={href} className={className}>
        {label}
      </Link>
    );
  }

  return (
    <a href={href} className={className}>
      {label}
    </a>
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
          <Link to="/solutions/smes" className="w-full cursor-pointer">
            SME's
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/solutions/ca" className="w-full cursor-pointer">
            CA
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/solutions/startups" className="w-full cursor-pointer">
            Startups
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/solutions/enterprises" className="w-full cursor-pointer">
            Enterprises
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/solutions/freelancers" className="w-full cursor-pointer">
            Freelancers
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Products Dropdown Component
const ProductsDropdown = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center font-medium text-gray-700 hover:text-smebank-600 transition-colors">
        Products
        <ChevronDown className="ml-1 h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-48">
        <DropdownMenuItem asChild>
          <Link to="/start" className="w-full cursor-pointer flex items-center justify-between">
            <span>Aczen Orbit</span>
            <span className="bg-gradient-to-r from-smebank-500 to-smeteal-500 text-white text-xs px-2 py-1 rounded-full font-semibold">New</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/products/aczen-crm" className="w-full cursor-pointer">
            Aczen CRM
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/products/aczen-ide" className="w-full cursor-pointer">
            Aczen IDE
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/products/aczen-os" className="w-full cursor-pointer">
            Aczen OS
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
          <Link to="/solutions/smes" className="block py-1 text-sm text-gray-600 hover:text-smebank-600">
            SME's
          </Link>
          <Link to="/solutions/ca" className="block py-1 text-sm text-gray-600 hover:text-smebank-600">
            CA
          </Link>
          <Link to="/solutions/startups" className="block py-1 text-sm text-gray-600 hover:text-smebank-600">
            Startups
          </Link>
          <Link to="/solutions/enterprises" className="block py-1 text-sm text-gray-600 hover:text-smebank-600">
            Enterprises
          </Link>
          <Link to="/solutions/freelancers" className="block py-1 text-sm text-gray-600 hover:text-smebank-600">
            Freelancers
          </Link>
        </div>
      )}
    </div>
  );
};

// Mobile Products Menu Component
const MobileProductsMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-2 text-smebank-700 font-medium"
      >
        Products
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="pl-4 space-y-2">
          <Link to="/start" className="flex items-center justify-between py-1 text-sm text-gray-600 hover:text-smebank-600">
            <span>Aczen Orbit</span>
            <span className="bg-gradient-to-r from-smebank-500 to-smeteal-500 text-white text-xs px-2 py-1 rounded-full font-semibold">New</span>
          </Link>
          <Link to="/products/aczen-crm" className="block py-1 text-sm text-gray-600 hover:text-smebank-600">
            Aczen CRM
          </Link>
          <Link to="/products/aczen-ide" className="block py-1 text-sm text-gray-600 hover:text-smebank-600">
            Aczen IDE
          </Link>
          <Link to="/products/aczen-os" className="block py-1 text-sm text-gray-600 hover:text-smebank-600">
            Aczen OS
          </Link>
        </div>
      )}
    </div>
  );
};

export default Navbar;
