import { useState, useEffect } from 'react';
import { ArrowRight, Building2, Handshake, Users, TrendingUp, CheckCircle, Star, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Partners = () => {
  // Partner logos with responsive sizing
  const partners = [
    {
      name: "Axis Bank",
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Axis_Bank_logo.svg/2560px-Axis_Bank_logo.svg.png",
      alt: "Axis Bank logo",
      category: "Banking Partner"
    },
    {
      name: "RBIH",
      logo: "https://rbihub.in/wp-content/uploads/2025/04/RBiH-logo.png",
      alt: "RBIH logo",
      category: "Technology Partner"
    },
    {
      name: "Cashfree Payments",
      logo: "https://mma.prnewswire.com/media/1714361/Cashfree_Payments_Logo.jpg?p=facebook",
      alt: "Cashfree Payments logo",
      category: "Payment Partner"
    },
    {
      name: "DigiLocker",
      logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRRJ1dekE-1WtmOmfZl_UTAIeUMV450jmAE9g&s",
      alt: "DigiLocker logo",
      category: "Digital Identity Partner"
    },
    {
      name: "Meri Pehchan",
      logo: "https://img1.digitallocker.gov.in/ndh/smart/images/meripehchaan-logo.png",
      alt: "Meri Pehchan logo",
      category: "Identity Verification Partner"
    }
  ];

  const partnershipTypes = [
    {
      icon: <Building2 className="h-8 w-8 text-smebank-600" />,
      title: "Banking Partners",
      description: "Leading financial institutions providing comprehensive banking services and infrastructure support.",
      count: "15+ Banks"
    },
    {
      icon: <Handshake className="h-8 w-8 text-smebank-600" />,
      title: "Technology Partners",
      description: "Innovative tech companies helping us deliver cutting-edge financial solutions and digital experiences.",
      count: "25+ Tech Partners"
    },
    {
      icon: <Users className="h-8 w-8 text-smebank-600" />,
      title: "Channel Partners",
      description: "Trusted intermediaries and distributors expanding our reach to serve more customers across India.",
      count: "100+ Channels"
    },
    {
      icon: <Award className="h-8 w-8 text-smebank-600" />,
      title: "Strategic Alliances",
      description: "Long-term partnerships with industry leaders to create comprehensive financial ecosystems.",
      count: "10+ Alliances"
    }
  ];

  const benefits = [
    "Access to comprehensive financial products",
    "Dedicated partner support team",
    "Competitive commission structures",
    "Regular training and certification programs",
    "Marketing and sales support",
    "Advanced technology integration"
  ];

  const testimonials = [
    {
      name: "Rajesh Kumar",
      company: "Kumar Financial Services",
      content: "Partnering with Aczen has transformed our business. The support and product range have exceeded our expectations.",
      rating: 5
    },
    {
      name: "Priya Sharma",
      company: "TechSolutions Pvt Ltd",
      content: "The technology integration was seamless, and our clients love the new banking solutions we can offer.",
      rating: 5
    }
  ];

  const [logoClasses, setLogoClasses] = useState("h-12 md:h-16");
  
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setLogoClasses("h-10");
      } else {
        setLogoClasses("h-12 md:h-16");
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-smebank-50 to-smeteal-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-4 bg-smebank-100 text-smebank-800 hover:bg-smebank-200">
              Partnership Program
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Building India's Financial 
              <span className="bg-gradient-to-r from-smebank-600 to-smeteal-600 text-transparent bg-clip-text">
                {" "}Future Together
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Join our network of trusted partners and help us democratize financial services across India. 
              Together, we're creating opportunities for millions of businesses and individuals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-smebank-600 to-smeteal-600 hover:from-smebank-700 hover:to-smeteal-700 text-white px-8 py-3"
              >
                Become a Partner
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="px-8 py-3" asChild>
                <Link to="/partner-portal">
                  Partner Portal
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Current Partners Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Trusted Partners</h2>
            <p className="text-lg text-gray-600">Working with India's leading institutions to serve you better</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 items-center justify-items-center mb-12">
            {partners.map((partner, index) => (
              <div key={index} className="group text-center">
                <div className="flex items-center justify-center mb-3">
                  <img 
                    src={partner.logo} 
                    alt={partner.alt} 
                    className={`${logoClasses} object-contain filter grayscale hover:grayscale-0 transition-all duration-300 group-hover:scale-105`} 
                  />
                </div>
                <Badge variant="outline" className="text-xs">
                  {partner.category}
                </Badge>
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <p className="text-sm md:text-base text-gray-500 max-w-2xl mx-auto">
              We've partnered with India's leading financial institutions and technology companies 
              to provide you with the best services tailored for your needs.
            </p>
          </div>
        </div>
      </section>

      {/* Partnership Types Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Partnership Opportunities
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Multiple ways to partner with us and grow your business while serving customers better.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {partnershipTypes.map((type, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-300 text-center">
                <CardHeader>
                  <div className="mx-auto mb-4 p-3 bg-smebank-50 rounded-full w-fit">
                    {type.icon}
                  </div>
                  <CardTitle className="text-xl">{type.title}</CardTitle>
                  <Badge className="w-fit mx-auto bg-smebank-100 text-smebank-800">
                    {type.count}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">
                    {type.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img 
                src="/placeholder.svg" 
                alt="Partnership Benefits" 
                className="rounded-lg shadow-xl w-full h-96 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-smebank-600/20 to-smeteal-600/20 rounded-lg"></div>
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center">
                  <TrendingUp className="h-6 w-6 text-green-500 mr-2" />
                  <div>
                    <div className="font-semibold text-gray-900">150+ Active Partners</div>
                    <div className="text-sm text-gray-600">Growing network nationwide</div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Why Partner with Aczen?
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Join a growing network of successful partners who are transforming the financial 
                services landscape in India. We provide the tools, support, and opportunities you need to succeed.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-smebank-600">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center text-white">
            <div>
              <div className="text-4xl font-bold mb-2">150+</div>
              <div className="text-smebank-100">Active Partners</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">₹1,000Cr+</div>
              <div className="text-smebank-100">Business Generated</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-smebank-100">Cities Covered</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">98%</div>
              <div className="text-smebank-100">Partner Satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What Our Partners Say
            </h2>
            <p className="text-lg text-gray-600">
              Hear from successful partners who've grown their business with us.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-4 italic">"{testimonial.content}"</p>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">{testimonial.company}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-smebank-600 to-smeteal-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Partner with Us?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join our growing network of successful partners and help us build India's financial future. 
            Let's create opportunities together.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-smebank-600 hover:bg-gray-100 px-8 py-3 text-lg font-semibold"
            >
              Apply Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-white text-white hover:bg-white hover:text-smebank-600 px-8 py-3"
            >
              Download Partnership Guide
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Partners;