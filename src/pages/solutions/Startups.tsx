import { ArrowRight, Rocket, Zap, Target, Globe, CheckCircle, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Startups = () => {
  const features = [
    {
      icon: <Rocket className="h-8 w-8 text-smebank-600" />,
      title: "Startup Banking",
      description: "Zero-fee current accounts, digital payments, and banking solutions designed for early-stage companies."
    },
    {
      icon: <Zap className="h-8 w-8 text-smebank-600" />,
      title: "Quick Funding",
      description: "Fast-track loan approvals and venture debt options to fuel your startup's growth and expansion."
    },
    {
      icon: <Target className="h-8 w-8 text-smebank-600" />,
      title: "Investor Connect",
      description: "Access to our network of angel investors, VCs, and funding opportunities for scaling your business."
    },
    {
      icon: <Globe className="h-8 w-8 text-smebank-600" />,
      title: "Global Expansion",
      description: "Multi-currency accounts, international payments, and support for global business operations."
    }
  ];

  const benefits = [
    "Zero balance current account for first 2 years",
    "Free digital payment gateway integration",
    "Dedicated startup relationship manager",
    "Access to exclusive investor meetups",
    "Flexible loan terms with competitive rates",
    "Free financial planning and advisory services"
  ];

  const fundingOptions = [
    {
      title: "Seed Funding Support",
      amount: "₹5L - ₹50L",
      description: "Early-stage funding for MVP development and initial operations",
      features: ["Quick approval", "Flexible terms", "Mentorship included"]
    },
    {
      title: "Growth Capital",
      amount: "₹50L - ₹5Cr",
      description: "Scale your operations with working capital and expansion loans",
      features: ["Revenue-based", "Asset-light", "Growth-focused"]
    },
    {
      title: "Venture Debt",
      amount: "₹1Cr - ₹25Cr",
      description: "Non-dilutive funding for funded startups looking to extend runway",
      features: ["Equity upside", "Flexible repayment", "VC-backed preferred"]
    }
  ];

  const testimonials = [
    {
      name: "Arjun Mehta",
      company: "TechFlow Solutions",
      content: "Aczen's startup program gave us the financial foundation we needed. The zero-balance account and quick funding were game-changers.",
      rating: 5
    },
    {
      name: "Sneha Gupta",
      company: "EcoGreen Innovations",
      content: "The investor connect program helped us raise our Series A. Their network and support have been invaluable.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-smebank-50 to-smeteal-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-4 bg-smebank-100 text-smebank-800 hover:bg-smebank-200">
              Startup Solutions
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Fuel Your 
              <span className="bg-gradient-to-r from-smebank-600 to-smeteal-600 text-transparent bg-clip-text">
                {" "}Startup Dreams
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              From idea to IPO, we're your financial partner at every stage. Get access to funding, 
              banking solutions, and investor networks designed specifically for startups.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-smebank-600 to-smeteal-600 hover:from-smebank-700 hover:to-smeteal-700 text-white px-8 py-3"
              >
                Start Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="px-8 py-3">
                Book a Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Built for Startup Success
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to build, scale, and succeed. Our startup-focused solutions grow with your business.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 p-3 bg-smebank-50 rounded-full w-fit">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Funding Options Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Funding Options for Every Stage
            </h2>
            <p className="text-lg text-gray-600">
              From seed to scale, we have the right funding solution for your startup's growth stage.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {fundingOptions.map((option, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-300 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-smebank-600 to-smeteal-600"></div>
                <CardHeader>
                  <CardTitle className="text-xl">{option.title}</CardTitle>
                  <div className="text-2xl font-bold text-smebank-600">{option.amount}</div>
                  <CardDescription>{option.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {option.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </div>
                    ))}
                  </div>
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
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Why Startups Choose Aczen
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                We understand the unique challenges startups face and provide tailored solutions 
                to help you focus on what matters most - building your business.
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
            <div className="relative">
              <img 
                src="/placeholder.svg" 
                alt="Startup Growth" 
                className="rounded-lg shadow-xl w-full h-96 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-smebank-600/20 to-smeteal-600/20 rounded-lg"></div>
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center">
                  <TrendingUp className="h-6 w-6 text-green-500 mr-2" />
                  <div>
                    <div className="font-semibold text-gray-900">500+ Startups Funded</div>
                    <div className="text-sm text-gray-600">₹250Cr+ Disbursed</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Startup Success Stories
            </h2>
            <p className="text-lg text-gray-600">
              Hear from founders who've scaled their startups with our support.
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
                    <p className="text-sm text-gray-500">Founder, {testimonial.company}</p>
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
            Ready to Scale Your Startup?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join hundreds of successful startups who've chosen Aczen as their financial partner. 
            Let's build the future together.
          </p>
          <Button 
            size="lg" 
            className="bg-white text-smebank-600 hover:bg-gray-100 px-8 py-3 text-lg font-semibold"
          >
            Start Now
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Startups;