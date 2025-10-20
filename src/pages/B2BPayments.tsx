import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { submitPhoneNumber } from "@/services/sheets";
import Footer from "@/components/Footer";
import { 
  Menu, 
  X, 
  ArrowRight, 
  CreditCard, 
  Building, 
  Zap, 
  Shield, 
  BarChart3, 
  FileText,
  Users,
  CheckCircle,
  Play,
  Banknote,
  Smartphone,
  Globe,
  TrendingUp,
  Lock,
  Clock,
  Star,
  Award,
  Layers,
  Target,
  Workflow,
  Database,
  ChevronRight,
  ArrowUpRight,
  Plane
} from "lucide-react";

const B2BPayments = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    email: '',
    phone: ''
  });
  const [phoneStatus, setPhoneStatus] = useState<'idle'|'sending'|'success'|'error'>('idle');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Sticky navbar effect
  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle demo request
    console.log('Demo request:', formData);
    alert('Thank you! Our team will contact you soon.');
  };

  const features = [
    {
      icon: <Building className="h-10 w-10 text-blue-600" />,
      title: "Unified Accounting + Banking",
      description: "One comprehensive platform to manage everything from bookkeeping to payments, eliminating the complexity of multiple systems and vendors.",
      badge: "Enterprise Ready",
      bgColor: "from-blue-500 to-blue-600",
      iconBg: "bg-blue-100"
    },
    {
      icon: <Zap className="h-10 w-10 text-yellow-600" />,
      title: "Seamless B2B Payments",
      description: "Real-time vendor and customer transactions with instant settlement, tracking capabilities, and automated workflow orchestration.",
      badge: "Real-time",
      bgColor: "from-yellow-500 to-orange-500",
      iconBg: "bg-yellow-100"
    },
    {
      icon: <BarChart3 className="h-10 w-10 text-green-600" />,
      title: "Smart Reconciliation",
      description: "AI-powered auto-sync with ledgers and intelligent payment matching with invoices for accurate, error-free bookkeeping.",
      badge: "AI-Powered",
      bgColor: "from-green-500 to-emerald-500",
      iconBg: "bg-green-100"
    },
    {
      icon: <CreditCard className="h-10 w-10 text-purple-600" />,
      title: "Multiple Payment Rails",
      description: "Accept and send payments via UPI, cards, net banking, RTGS, NEFT, and offline methods for complete payment flexibility.",
      badge: "Multi-channel",
      bgColor: "from-purple-500 to-pink-500",
      iconBg: "bg-purple-100"
    },
    {
      icon: <TrendingUp className="h-10 w-10 text-indigo-600" />,
      title: "Built-in Financing Options",
      description: "Access credit support, flexible payment terms, and working capital solutions to optimize cash flow for sustained growth.",
      badge: "Credit Ready",
      bgColor: "from-indigo-500 to-blue-500",
      iconBg: "bg-indigo-100"
    },
    {
      icon: <FileText className="h-10 w-10 text-red-600" />,
      title: "Automated Compliance & Reports",
      description: "GST-ready invoices, automated tax calculations, comprehensive financial statements, and regulatory compliance management.",
      badge: "Compliant",
      bgColor: "from-red-500 to-pink-500",
      iconBg: "bg-red-100"
    }
  ];

  const howItWorksSteps = [
    {
      step: "01",
      icon: <Building className="h-16 w-16 text-blue-600" />,
      title: "Onboard Your Business",
      description: "Enterprise-grade onboarding with complete KYC, business verification, and security protocols completed in under 10 minutes.",
      time: "< 10 mins",
      bgColor: "from-blue-400 to-blue-600",
      iconBg: "bg-blue-100"
    },
    {
      step: "02",
      icon: <Award className="h-16 w-16 text-green-600" />,
      title: "Create Your B2B ID",
      description: "Receive your unique Aczen Bilz B2B identifier with enterprise-grade security for seamless business transactions.",
      time: "Instant",
      bgColor: "from-green-400 to-green-600",
      iconBg: "bg-green-100"
    },
    {
      step: "03",
      icon: <Globe className="h-16 w-16 text-purple-600" />,
      title: "Link Business Partners",
      description: "Connect with customers and vendors using their Aczen Bilz IDs for instant, secure, and traceable transactions.",
      time: "Real-time",
      bgColor: "from-purple-400 to-purple-600",
      iconBg: "bg-purple-100"
    },
    {
      step: "04",
      icon: <CheckCircle className="h-16 w-16 text-orange-600" />,
      title: "Transact & Reconcile",
      description: "Execute transactions, auto-reconcile payments, and manage flexible buyer/seller arrangements with complete transparency.",
      time: "Automated",
      bgColor: "from-orange-400 to-orange-600",
      iconBg: "bg-orange-100"
    }
  ];

  const stats = [
    { value: "99.9%", label: "Uptime SLA", icon: <Shield className="h-6 w-6" />, color: "text-green-600" },
    { value: "< 2s", label: "Transaction Speed", icon: <Zap className="h-6 w-6" />, color: "text-yellow-600" },
    { value: "256-bit", label: "Bank-grade Security", icon: <Lock className="h-6 w-6" />, color: "text-blue-600" },
    { value: "24/7", label: "Enterprise Support", icon: <Users className="h-6 w-6" />, color: "text-purple-600" }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isSticky 
          ? 'bg-white/95 backdrop-blur-xl shadow-2xl border-b border-slate-200/50' 
          : 'bg-white/80 backdrop-blur-sm'
      }`}>
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold">BC</span>
              </div>
              <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Aczen Bilz
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-12">
              <Link to="/" className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-300 relative group">
                Home
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 transition-all group-hover:w-full"></span>
              </Link>
              <Link to="/pricing" className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-300 relative group">
                Pricing
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 transition-all group-hover:w-full"></span>
              </Link>
              <Link to="/contacts" className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-300 relative group">
                Contact
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 transition-all group-hover:w-full"></span>
              </Link>
              {/* Sign In / Sign Up removed as requested */}
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 rounded-xl hover:bg-slate-50 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="lg:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200/50">
              <div className="px-6 py-6 space-y-6">
                <Link to="/" className="block text-slate-700 hover:text-slate-900 font-medium">
                  Home
                </Link>
                <Link to="/pricing" className="block text-slate-700 hover:text-slate-900 font-medium">
                  Pricing
                </Link>
                <Link to="/contacts" className="block text-slate-700 hover:text-slate-900 font-medium">
                  Contact
                </Link>
                {/* Sign In / Sign Up removed from mobile menu */}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-white relative overflow-hidden">
        {/* Clean, bold hero background */}
        <div className="absolute left-0 bottom-0 w-[400px] h-[400px] bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 rounded-full blur-3xl -z-10"></div>
        <div className="absolute right-0 top-0 w-[400px] h-[400px] bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 rounded-full blur-3xl -z-10"></div>
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center justify-center text-center">
            {/* Status badge */}
            <div className="mb-6">
              <span className="inline-flex items-center px-4 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium shadow">
                <span className="w-2 h-2 rounded-full bg-blue-400 mr-2"></span>
                Now Live · Trusted by 10,000+ SMBs
              </span>
            </div>
            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-extrabold mb-4 leading-tight">
              <span className="block text-gray-900">Effortlessly manage</span>
              <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">B2B transactions</span>
              <span className="block text-gray-800 mt-2">with <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">Bharat Connect</span></span>
            </h1>
            {/* Decorative underline */}
            <div className="mx-auto h-1 w-56 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 mb-6" />
            {/* Description */}
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
              Manage bills, invoices, and payments on a single secure platform—integrate with your business apps, accept cards, UPI, and NetBanking, and automate reconciliation and financing so you can focus on growth.
            </p>
            {/* Phone capture + submit (saves to Google Sheets webhook) */}
            <div className="w-full max-w-3xl mx-auto mb-6">
              <div className="w-full md:w-[600px] mx-auto">
                <label htmlFor="heroPhone" className="sr-only">Phone number</label>
                <div className="flex items-center gap-3">
                  <input
                    id="heroPhone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter your phone number to get started"
                    className="flex-1 h-14 rounded-full border-2 border-purple-200 px-6 text-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-xl"
                  />
                  <Button
                    size="lg"
                    onClick={async (e) => {
                      e.preventDefault();
                      setPhoneError(null);
                      
                      // Phone validation for Indian numbers
                      const phoneRegex = /^[6-9]\d{9}$/;
                      if (!formData.phone || !phoneRegex.test(formData.phone.trim())) {
                        setPhoneError('Please enter a valid 10-digit Indian phone number');
                        setPhoneStatus('error');
                        return;
                      }

                      setPhoneStatus('sending');
                      try {
                        const result = await submitPhoneNumber(formData.phone);
                        if (result.result === 'success') {
                          setPhoneStatus('success');
                          setFormData({ ...formData, phone: '' });
                        } else {
                          throw new Error(result.message);
                        }
                      } catch (err: any) {
                        setPhoneStatus('error');
                        setPhoneError(err?.message || 'Failed to submit phone number');
                      }
                    }}
                    className="h-14 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 text-lg font-semibold hover:opacity-90 transition-opacity shadow-xl hover:shadow-2xl"
                  >
                    Get Started
                  </Button>
                </div>
                <div className="mt-3 text-center min-h-[24px]">
                  {phoneStatus === 'sending' && (
                    <span className="text-gray-600 inline-flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  )}
                  {phoneStatus === 'success' && (
                    <span className="text-green-600 font-medium inline-flex items-center">
                      <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Thanks! We'll contact you shortly
                    </span>
                  )}
                  {phoneStatus === 'error' && (
                    <span className="text-red-600 font-medium inline-flex items-center">
                      <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      {phoneError}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {/* Feature highlights */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-2 text-gray-500 text-sm">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                <span>No setup fees</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                <span>45-day free trial</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="py-24 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <div className="inline-flex items-center bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full px-4 py-2 mb-6">
              <Layers className="h-4 w-4 text-indigo-600 mr-2" />
              <span className="text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Enterprise Features</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              Powerful Features for Modern B2B Payments
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Everything you need to streamline your business payments and financial operations with enterprise-grade reliability
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 border-0 bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden relative"
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.bgColor}`}></div>
                <CardHeader className="text-center pb-6 pt-8">
                  <div className="relative mx-auto mb-6">
                    <div className={`w-20 h-20 ${feature.iconBg} group-hover:scale-110 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg`}>
                      {feature.icon}
                    </div>
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900 mb-3">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center px-6 pb-8">
                  <CardDescription className="text-gray-600 leading-relaxed text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-100/30 to-purple-100/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-br from-pink-100/30 to-orange-100/30 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center bg-gradient-to-r from-blue-100 to-green-100 rounded-full px-4 py-2 mb-6">
              <Workflow className="h-4 w-4 text-blue-600 mr-2" />
              <span className="text-sm font-medium bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">Implementation Process</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              How Aczen Bilz Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Get started in 4 simple steps and transform your B2B payment experience with enterprise-grade efficiency
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {/* Connection Lines */}
            <div className="hidden lg:block absolute top-24 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-blue-200 via-purple-300 to-orange-200"></div>
            
            {howItWorksSteps.map((step, index) => (
              <div key={index} className="text-center group relative">
                <div className="relative mb-8">
                  <div className={`${step.iconBg} group-hover:scale-110 transition-all duration-500 rounded-3xl w-32 h-32 flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:shadow-2xl`}>
                    {step.icon}
                  </div>
                  <div className={`absolute -top-3 -right-3 bg-gradient-to-r ${step.bgColor} text-white text-sm font-bold rounded-full w-10 h-10 flex items-center justify-center shadow-lg`}>
                    {step.step}
                  </div>
                  <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 font-medium shadow-md">
                    {step.time}
                  </Badge>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {step.title}
                </h3>
                <p className="text-gray-600 leading-relaxed text-base">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto px-6 text-center relative z-10">
          <div className="max-w-4xl mx-auto space-y-10">
            <div className="space-y-6">
              <div className="inline-flex items-center bg-white/20 rounded-full px-4 py-2">
                <Target className="h-4 w-4 text-white mr-2" />
                <span className="text-sm font-medium text-white">Ready to Transform?</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                Ready to Transform Your B2B Payments?
              </h2>
              <p className="text-xl text-white/90 leading-relaxed">
                Join thousands of businesses already using Aczen Bilz to streamline their financial operations 
                and accelerate growth with enterprise-grade payment solutions.
              </p>
            </div>
            
            {/* Phone number input in CTA section */}
            <div className="w-full max-w-md mx-auto">
              <label htmlFor="ctaPhone" className="sr-only">Phone number</label>
              <div className="flex items-center gap-3">
                <input
                  id="ctaPhone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter your phone number"
                  className="flex-1 h-12 rounded-full border border-white/30 bg-white/10 backdrop-blur-sm text-white px-4 placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
                <Button
                  size="lg"
                  onClick={async (e) => {
                    e.preventDefault();
                    setPhoneError(null);
                    
                    // Phone validation for Indian numbers
                    const phoneRegex = /^[6-9]\d{9}$/;
                    if (!formData.phone || !phoneRegex.test(formData.phone.trim())) {
                      setPhoneError('Please enter a valid 10-digit Indian phone number');
                      setPhoneStatus('error');
                      return;
                    }

                    setPhoneStatus('sending');
                    try {
                      const result = await submitPhoneNumber(formData.phone);
                      if (result.result === 'success') {
                        setPhoneStatus('success');
                        setFormData({ ...formData, phone: '' });
                      } else {
                        throw new Error(result.message);
                      }
                    } catch (err: any) {
                      setPhoneStatus('error');
                      setPhoneError(err?.message || 'Failed to submit phone number');
                    }
                  }}
                  className="rounded-full bg-white text-purple-600 hover:bg-gray-100 px-6 py-3"
                >
                  Request Call Back
                </Button>
              </div>
              <div className="mt-3 text-center">
                {phoneStatus === 'sending' && <span className="text-sm text-white/80">Sending...</span>}
                {phoneStatus === 'success' && <span className="text-sm text-green-300">Thanks — we'll call you soon.</span>}
                {phoneStatus === 'error' && <span className="text-sm text-red-300">{phoneError}</span>}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-8 text-white/80 text-sm">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2 text-green-300" />
                <span>Free 30-day trial</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2 text-green-300" />
                <span>No setup fees</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2 text-green-300" />
                <span>24/7 enterprise support</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Flight Offers Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-100/30 to-purple-100/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-br from-pink-100/30 to-orange-100/30 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-gradient-to-r from-blue-100 to-purple-100 rounded-full px-4 py-2 mb-6">
              <Plane className="h-4 w-4 text-blue-600 mr-2" />
              <span className="text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Exclusive Travel Benefits</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              Unlock <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Complimentary Flight Offers</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              With every IT filing through Aczen Bilz, get exclusive access to premium flight deals and travel rewards
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-0 bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
              <CardHeader className="text-center pb-6 pt-8">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Globe className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl font-bold text-gray-900">Domestic Flights</CardTitle>
              </CardHeader>
              <CardContent className="text-center px-6 pb-8">
                <CardDescription className="text-gray-600 leading-relaxed">
                  Get up to ₹5,000 off on domestic flights with every successful IT filing through our platform
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-0 bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
              <CardHeader className="text-center pb-6 pt-8">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Plane className="h-8 w-8 text-purple-600" />
                </div>
                <CardTitle className="text-xl font-bold text-gray-900">International Travel</CardTitle>
              </CardHeader>
              <CardContent className="text-center px-6 pb-8">
                <CardDescription className="text-gray-600 leading-relaxed">
                  Exclusive discounts up to ₹25,000 on international flight bookings for premium customers
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-0 bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
              <CardHeader className="text-center pb-6 pt-8">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Star className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-xl font-bold text-gray-900">Premium Benefits</CardTitle>
              </CardHeader>
              <CardContent className="text-center px-6 pb-8">
                <CardDescription className="text-gray-600 leading-relaxed">
                  Complimentary lounge access, priority check-in, and extra baggage allowance with partner airlines
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-6 bg-white/50 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
              <div className="flex items-center text-gray-600">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span>Valid on all airlines</span>
              </div>
              <div className="flex items-center text-gray-600">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span>Instant redemption</span>
              </div>
              <div className="flex items-center text-gray-600">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span>No blackout dates</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default B2BPayments;