import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

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
            <NavItem label="Features" href="#features" />
            <NavItem label="About Us" href="/about" />
            <NavItem label="Security" href="#video" />
            <NavItem label="Partners" href="#partners" />
            <NavItem label="FAQ" href="#faq" />
            <NavItem label="Contact" href="#contact" />
          </nav>
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
            <NavItem mobile label="Features" href="#features" />
            <NavItem mobile label="About Us" href="/about" />
            <NavItem mobile label="Security" href="#video" />
            <NavItem mobile label="Partners" href="#partners" />
            <NavItem mobile label="FAQ" href="#faq" />
            <NavItem mobile label="Contact" href="#contact" />
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
  return (
    <a
      href={href}
      className={`font-medium transition-colors ${
        mobile
          ? "block py-2 text-smebank-700"
          : "text-gray-700 hover:text-smebank-600"
      }`}
    >
      {label}
    </a>
  );
};

export default Navbar;
