import React, { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Building, Users, User, FileText, Clock, Shield, Star, Phone, Globe, CreditCard, Activity } from "lucide-react";

const Start = () => {
  const [selectedCompanyType, setSelectedCompanyType] = useState<string>("");

  const companyTypes = [
    {
      id: "pvt-ltd",
      name: "Private Limited Company",
      shortName: "Pvt Ltd",
      description: "Most popular choice for startups and growing businesses",
      features: [
        "Limited liability protection",
        "Separate legal entity",
        "Easy to raise funding",
        "Tax benefits available",
        "Professional credibility"
      ],
      minDirectors: "2 Directors",
      minShareholders: "2 Shareholders",
      compliance: "Moderate",
      bestFor: "Startups, SMEs, businesses planning to raise funding"
    },
    {
      id: "llp",
      name: "Limited Liability Partnership",
      shortName: "LLP", 
      description: "Ideal for professional services and partnerships",
      features: [
        "Limited liability for partners",
        "Flexible management structure",
        "Lower compliance requirements",
        "No minimum capital requirement",
        "Tax transparency"
      ],
      minDirectors: "2 Partners",
      minShareholders: "No shareholders",
      compliance: "Low",
      bestFor: "Professional services, consultancy, small partnerships"
    },
    {
      id: "opc",
      name: "One Person Company",
      shortName: "OPC",
      description: "Perfect for solo entrepreneurs and individual businesses",
      features: [
        "Single person ownership",
        "Limited liability protection",
        "Separate legal identity",
        "Easy compliance",
        "Can convert to Pvt Ltd later"
      ],
      minDirectors: "1 Director",
      minShareholders: "1 Shareholder",
      compliance: "Low",
      bestFor: "Solo entrepreneurs, freelancers, small businesses"
    }
  ];

  const registrationProcess = [
    {
      step: 1,
      title: "Structuring Call",
      subtitle: "Expert Consultation",
      description: "25 min Call",
      detail: "Get personalized guidance from qualified professionals who understand your needs and recommend the right entity structure",
      icon: <Phone className="h-6 w-6" />,
      color: "bg-blue-100 text-blue-700",
      time: "25 min Call"
    },
    {
      step: 2,
      title: "Information",
      subtitle: "Basic Details", 
      description: "5 min form",
      detail: "Provide basic company information and upload required documents through our simple form",
      icon: <FileText className="h-6 w-6" />,
      color: "bg-green-100 text-green-700",
      time: "5 min form"
    },
    {
      step: 3,
      title: "Payment",
      subtitle: "Secure Checkout",
      description: "2 min process", 
      detail: "Complete secure payment for registration fees and government charges",
      icon: <CreditCard className="h-6 w-6" />,
      color: "bg-purple-100 text-purple-700",
      time: "2 min process"
    },
    {
      step: 4,
      title: "Track Progress",
      subtitle: "Live Updates",
      description: "Real-time",
      detail: "Monitor your application status with real-time updates until completion",
      icon: <Activity className="h-6 w-6" />,
      color: "bg-orange-100 text-orange-700", 
      time: "Real-time"
    }
  ];

  const benefits = [
    {
      title: "Quick Processing",
      description: "Get your company registered in 7-15 working days",
      icon: <Clock className="h-8 w-8 text-smebank-600" />
    },
    {
      title: "Expert Support",
      description: "Dedicated support team to guide you through the process",
      icon: <Users className="h-8 w-8 text-smebank-600" />
    },
    {
      title: "Secure & Compliant", 
      description: "100% legal compliance with government regulations",
      icon: <Shield className="h-8 w-8 text-smebank-600" />
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <Navbar />
      
      <main className="pt-16 pb-16">
        {/* Breadcrumb */}
        <div className="container mx-auto px-4 mb-8">
          <div className="flex items-center space-x-2 text-sm">
            <Link to="/" className="text-gray-500 hover:text-gray-700">Home</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">Start Your Company</span>
          </div>
        </div>

        {/* Amazing Hero Section */}
        <section className="relative overflow-hidden">
          {/* Background Elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-smebank-50 via-white to-smeteal-50 pointer-events-none"></div>
          <div className="absolute top-10 left-10 w-64 h-64 bg-smebank-100 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-pulse pointer-events-none"></div>
          <div className="absolute top-20 right-10 w-64 h-64 bg-smeteal-100 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-pulse pointer-events-none" style={{animationDelay: '2s'}}></div>
          <div className="absolute -bottom-20 left-20 w-64 h-64 bg-smeorange-100 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-pulse pointer-events-none" style={{animationDelay: '4s'}}></div>
          
          <div className="container mx-auto px-4 py-12 relative">
            <div className="grid lg:grid-cols-2 gap-8 items-center min-h-[500px]">
              {/* Left Content */}
              <div className="space-y-8">
                <div className="space-y-6">
                  <div className="inline-flex items-center bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-smebank-100">
                    <Star className="h-4 w-4 text-smeorange-500 mr-2" />
                    <span className="text-sm font-medium text-gray-700">Trusted by 1000+ Businesses</span>
                  </div>
                  
                  <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                    <span className="text-gray-900">Start Your</span>
                    <br />
                    <span className="bg-gradient-to-r from-smebank-600 to-smeteal-600 bg-clip-text text-transparent">
                      Dream Company
                    </span>
                    <br />
                    <span className="text-gray-900">Today</span>
                  </h1>
                  
                  <p className="text-xl text-gray-600 leading-relaxed max-w-xl">
                    Transform your business idea into reality with India's most trusted company registration platform. 
                    <span className="font-semibold text-smebank-700"> Complete legal compliance, expert guidance, </span>
                    and lightning-fast processing.
                  </p>
                </div>

                {/* Trust Badges */}
                <div className="flex flex-wrap gap-3">
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100 px-4 py-2">
                    <Clock className="h-4 w-4 mr-2" />
                    7-15 Days
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 px-4 py-2">
                    <Shield className="h-4 w-4 mr-2" />
                    100% Legal
                  </Badge>
                  <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 px-4 py-2">
                    <Users className="h-4 w-4 mr-2" />
                    Expert Support
                  </Badge>
                </div>

                {/* Pricing & CTA */}
                <div className="space-y-6">
                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-smebank-600 to-smeteal-600 bg-clip-text text-transparent">
                          ₹1,499
                        </div>
                        <p className="text-sm text-gray-500">+ Government fees</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500 line-through">₹5,999</div>
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">75% OFF</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-3">All-inclusive pricing • No hidden costs • Money-back guarantee</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button 
                      size="lg" 
                      className="bg-gradient-to-r from-smebank-600 to-smebank-700 hover:from-smebank-700 hover:to-smebank-800 text-white px-8 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
                      onClick={() => window.open('https://tally.so/r/w2pOKL', 'popup', 'width=800,height=600,scrollbars=yes,resizable=yes')}
                    >
                      Start Registration Now
                      <Star className="h-5 w-5 ml-2" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="lg"
                      className="border-2 border-smebank-200 text-smebank-700 hover:bg-smebank-50 px-8 py-4 text-lg font-semibold"
                    >
                      <Phone className="h-5 w-5 mr-2" />
                      Talk to Expert
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Visual */}
              <div className="relative flex items-center justify-center overflow-hidden h-[500px] lg:h-[600px]">
                {/* Main Visual Container */}
                <div className="relative w-full max-w-md mx-auto">
                  {/* Central Circle with Company Icons */}
                  <div className="relative flex items-center justify-center">
                    <div className="w-40 h-40 lg:w-48 lg:h-48 bg-gradient-to-br from-smebank-500 to-smeteal-500 rounded-full flex items-center justify-center shadow-2xl relative z-10">
                      <Building className="h-12 w-12 lg:h-16 lg:w-16 text-white" />
                    </div>
                    
                    {/* Floating Company Type Cards */}
                    <div className="absolute -top-6 -left-12 lg:-top-8 lg:-left-16 bg-white rounded-xl p-3 shadow-lg animate-bounce z-20" style={{animationDelay: '1s'}}>
                      <div className="text-center">
                        <div className="text-sm lg:text-lg font-bold text-smebank-700">Pvt Ltd</div>
                        <div className="text-xs text-gray-500">Most Popular</div>
                      </div>
                    </div>
                    
                    <div className="absolute -top-4 -right-12 lg:-top-6 lg:-right-16 bg-white rounded-xl p-3 shadow-lg animate-bounce z-20" style={{animationDelay: '2s'}}>
                      <div className="text-center">
                        <div className="text-sm lg:text-lg font-bold text-smeteal-700">LLP</div>
                        <div className="text-xs text-gray-500">Professional</div>
                      </div>
                    </div>
                    
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-white rounded-xl p-3 shadow-lg animate-bounce z-20" style={{animationDelay: '3s'}}>
                      <div className="text-center">
                        <div className="text-sm lg:text-lg font-bold text-smeorange-700">OPC</div>
                        <div className="text-xs text-gray-500">Solo Entrepreneur</div>
                      </div>
                    </div>
                  </div>

                  {/* Orbiting Elements */}
                  <div className="absolute inset-0 animate-spin z-5" style={{animationDuration: '30s'}}>
                    <div className="relative w-full h-full">
                      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-smebank-400 rounded-full opacity-70"></div>
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-smeteal-400 rounded-full opacity-70"></div>
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-smeorange-400 rounded-full opacity-70"></div>
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-smebank-300 rounded-full opacity-70"></div>
                    </div>
                  </div>

                  {/* Process Steps Around - Fixed positioning */}
                  <div className="absolute -left-8 lg:-left-16 top-33 lg:top-16 bg-white/90 backdrop-blur-sm rounded-lg p-2 lg:p-3 shadow-lg z-15">
                    <Phone className="h-4 w-4 lg:h-10 lg:w-6 text-blue-600 mx-auto mb-1" />
                    <div className="text-xs font-medium text-center">Consultation</div>
                  </div>
                  
        
                  
                  <div className="absolute -right-6 lg:-right-12 bottom-12 lg:bottom-16 bg-white/90 backdrop-blur-sm rounded-lg p-2 lg:p-3 shadow-lg z-15">
                    <CreditCard className="h-4 w-4 lg:h-6 lg:w-6 text-purple-600 mx-auto mb-1" />
                    <div className="text-xs font-medium text-center">Payment</div>
                  </div>
                  
                  <div className="absolute -left-6 lg:-left-12 bottom-8 lg:bottom-12 bg-white/90 backdrop-blur-sm rounded-lg p-2 lg:p-3 shadow-lg z-15">
                    <Activity className="h-4 w-4 lg:h-6 lg:w-6 text-orange-600 mx-auto mb-1" />
                    <div className="text-xs font-medium text-center">Track Progress</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 pt-8 border-t border-white/50">
              <div className="text-center">
                <div className="text-3xl font-bold text-smebank-700">1000+</div>
                <div className="text-sm text-gray-600">Companies Registered</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-smeteal-700">7-15</div>
                <div className="text-sm text-gray-600">Days Processing</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-smeorange-700">24/7</div>
                <div className="text-sm text-gray-600">Expert Support</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-smebank-700">100%</div>
                <div className="text-sm text-gray-600">Legal Compliance</div>
              </div>
            </div>
          </div>
        </section>

        {/* Company Types Selection */}
        <section className="container mx-auto px-4 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Company Type</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Select the business structure that aligns with your goals and requirements
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {companyTypes.map((type) => (
              <Card 
                key={type.id} 
                className={`relative cursor-pointer transition-all duration-300 hover:shadow-lg ${
                  selectedCompanyType === type.id 
                    ? 'ring-2 ring-smebank-500 shadow-lg' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedCompanyType(type.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-xl text-gray-900">{type.shortName}</CardTitle>
                    {selectedCompanyType === type.id && (
                      <CheckCircle className="h-6 w-6 text-smebank-600" />
                    )}
                  </div>
                  <CardDescription className="text-base font-medium text-gray-700">
                    {type.name}
                  </CardDescription>
                  <p className="text-sm text-gray-500 mt-2">{type.description}</p>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Directors:</span>
                      <span className="font-medium">{type.minDirectors}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Shareholders:</span>
                      <span className="font-medium">{type.minShareholders}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Compliance:</span>
                      <Badge variant={type.compliance === 'Low' ? 'secondary' : 'outline'} className="text-xs">
                        {type.compliance}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Key Features:</h4>
                    <ul className="space-y-1">
                      {type.features.slice(0, 3).map((feature, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-600">
                          <CheckCircle className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="border-t pt-4">
                    <p className="text-xs text-gray-500">
                      <strong>Best for:</strong> {type.bestFor}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Expert Assistance & Foreign Founder Friendly */}
        <section className="container mx-auto px-4 mb-16">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Structuring Assistance by Experts */}
            <div className="bg-gray-50 rounded-2xl p-8 lg:p-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Structuring Assistance by Experts
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Bots can't structure your business, our experts can.
              </p>
              <p className="text-gray-600 mb-8">
                Get personalized, on-call guidance from qualified professionals who understand your 
                needs and recommend the right entity structure.
              </p>
              
              {/* Expert consultation mockup */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-center space-x-4 mb-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-12 h-12 bg-smebank-100 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-smebank-600" />
                    </div>
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">You</div>
                    </div>
                  </div>
                  <div className="flex-1 border-t border-dashed border-gray-300"></div>
                  <div className="flex items-center space-x-2">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">Expert</div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center space-x-4 text-gray-400">
                  <Button variant="ghost" size="sm" className="p-2">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-2">
                    <Users className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-2">
                    <FileText className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Foreign Founder Friendly */}
            <div className="bg-gradient-to-br from-smebank-50 to-smeteal-50 rounded-2xl p-8 lg:p-12 relative overflow-hidden">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Foreign Founder Friendly
              </h2>
              <p className="text-lg text-smebank-700 mb-6">
                Your bridge to Indian business success.
              </p>
              <p className="text-gray-600 mb-8">
                We simplify the incorporation process for foreign founders, offering tailored guidance to 
                navigate regulations both in India and home country (like ODI for Indian founders).
              </p>
              
              {/* Global connectivity visual */}
              <div className="relative">
                <div className="w-32 h-32 mx-auto">
                  <div className="relative w-full h-full">
                    <div className="absolute inset-0 rounded-full border-4 border-dashed border-smebank-200 animate-pulse"></div>
                    <div className="absolute inset-4 rounded-full bg-gradient-to-r from-smebank-400 to-smeteal-400 flex items-center justify-center">
                      <Globe className="h-8 w-8 text-white" />
                    </div>
                    {/* Floating dots around the globe */}
                    <div className="absolute -top-2 left-1/2 w-3 h-3 bg-smebank-400 rounded-full animate-bounce"></div>
                    <div className="absolute -right-2 top-1/2 w-2 h-2 bg-smeteal-400 rounded-full animate-bounce" style={{animationDelay: '0.5s'}}></div>
                    <div className="absolute -bottom-2 left-1/3 w-2 h-2 bg-smeorange-400 rounded-full animate-bounce" style={{animationDelay: '1s'}}></div>
                    <div className="absolute -left-2 top-1/3 w-3 h-3 bg-smebank-300 rounded-full animate-bounce" style={{animationDelay: '1.5s'}}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="container mx-auto px-4 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Aczen?</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We make company registration simple, fast, and hassle-free
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="bg-smebank-50 p-4 rounded-full">
                    {benefit.icon}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Enhanced Process Section */}
        <section className="container mx-auto px-4 mb-16">
          <div className="bg-gradient-to-br from-smeorange-100 to-smeorange-200 rounded-3xl p-8 lg:p-12">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left side - Process Description */}
              <div>
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                  Easy 4-Step Process and Tracking
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  Incorporation made effortless.
                </p>
                <p className="text-gray-600 mb-8">
                  Our streamlined process includes a structuring call, gathering basic information, 
                  secure payment, and real-time tracking on our portal until completion. It's that simple!
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Expert consultation included
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Real-time progress tracking
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Secure document handling
                  </div>
                </div>
              </div>

              {/* Right side - Process Steps */}
              <div className="space-y-4">
                {registrationProcess.map((step, index) => (
                  <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`${step.color} p-3 rounded-lg`}>
                          {step.icon}
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 font-medium mb-1">
                            STEP {step.step}
                          </div>
                          <h3 className="text-lg font-bold text-gray-900">
                            {step.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {step.subtitle}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {step.time}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-3 ml-16">
                      {step.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4">
          <div className="bg-gradient-to-r from-smebank-600 to-smebank-700 rounded-2xl p-8 md:p-12 text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Start Your Business?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of entrepreneurs who trust Aczen for their business registration
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                className="bg-white text-smebank-700 hover:bg-gray-100 px-8 py-3"
                disabled={!selectedCompanyType}
              >
                {selectedCompanyType ? `Start ${companyTypes.find(t => t.id === selectedCompanyType)?.shortName} Registration` : 'Select Company Type to Continue'}
              </Button>
              <Button 
                variant="ghost" 
                size="lg" 
                className="text-white border-white hover:bg-white/10 px-8 py-3"
              >
                <Link to="/contacts" className="flex items-center">
                  Talk to Expert
                </Link>
              </Button>
            </div>
            <p className="text-sm mt-6 opacity-75">
              Questions? Call us at +91-XXXXX-XXXXX or{" "}
              <Link to="/contacts" className="underline">
                chat with our experts
              </Link>
            </p>
          </div>
        </section>

        {/* FAQ Preview */}
        <section className="container mx-auto px-4 mt-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">What documents do I need?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm">
                    PAN cards, Aadhaar cards, address proof, and passport photos of all directors/partners.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">How long does it take?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm">
                    Typically 7-15 working days depending on government processing and document verification.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">What's included in the price?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm">
                    Complete registration service, document preparation, filing, and expert consultation.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Can I track my application?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm">
                    Yes, you'll get real-time updates and can track progress through our dashboard.
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <div className="text-center mt-8">
              <Link to="/faq">
                <Button variant="outline">View All FAQs</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Start;