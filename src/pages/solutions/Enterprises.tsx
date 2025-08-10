import { ArrowRight, Building, Shield, Globe2, Users, CheckCircle, Star, BarChart3, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Enterprises = () => {
  const features = [
    {
      icon: <Building className="h-8 w-8 text-smebank-600" />,
      title: "Corporate Banking",
      description: "Comprehensive banking solutions for large enterprises with dedicated relationship management and priority services."
    },
    {
      icon: <Shield className="h-8 w-8 text-smebank-600" />,
      title: "Risk Management",
      description: "Advanced risk assessment tools, hedging solutions, and comprehensive insurance coverage for enterprise operations."
    },
    {
      icon: <Globe2 className="h-8 w-8 text-smebank-600" />,
      title: "Global Operations",
      description: "Multi-currency accounts, international trade finance, and global payment solutions for worldwide business operations."
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-smebank-600" />,
      title: "Treasury Management",
      description: "Sophisticated cash management, liquidity optimization, and investment solutions for enterprise treasury operations."
    }
  ];

  const services = [
    {
      title: "Working Capital Finance",
      description: "Flexible credit lines and working capital solutions",
      features: ["Credit limits up to ₹500Cr", "Competitive rates from 7.5%", "Quick disbursement"]
    },
    {
      title: "Trade Finance",
      description: "Complete trade finance solutions for import/export",
      features: ["Letters of Credit", "Bank Guarantees", "Export financing"]
    },
    {
      title: "Cash Management",
      description: "Advanced treasury and cash management services",
      features: ["Real-time reporting", "Automated reconciliation", "Multi-bank connectivity"]
    },
    {
      title: "Investment Banking",
      description: "Capital market solutions and advisory services",
      features: ["Debt syndication", "M&A advisory", "Capital restructuring"]
    }
  ];

  const benefits = [
    "Dedicated enterprise relationship team",
    "24/7 priority customer support",
    "Customized financial solutions",
    "Advanced digital banking platform",
    "Global network and correspondent banking",
    "Regulatory compliance support"
  ];

  const testimonials = [
    {
      name: "Rajesh Khanna",
      company: "Khanna Industries Ltd",
      designation: "CFO",
      content: "Aczen's enterprise solutions have streamlined our global operations. Their treasury management platform is exceptional.",
      rating: 5
    },
    {
      name: "Priya Malhotra",
      company: "TechCorp Solutions",
      designation: "Finance Director",
      content: "The dedicated relationship management and quick decision-making have been crucial for our expansion plans.",
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
              Enterprise Solutions
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Banking for 
              <span className="bg-gradient-to-r from-smebank-600 to-smeteal-600 text-transparent bg-clip-text">
                {" "}Large Enterprises
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Sophisticated financial solutions for large corporations. From treasury management to 
              global operations, we provide enterprise-grade banking services that scale with your business.
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
                Schedule Consultation
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
              Enterprise-Grade Banking Solutions
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Comprehensive financial services designed for the complex needs of large enterprises and corporations.
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

      {/* Services Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Comprehensive Service Portfolio
            </h2>
            <p className="text-lg text-gray-600">
              Full spectrum of financial services tailored for enterprise requirements.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-300 h-full">
                <CardHeader>
                  <CardTitle className="text-lg">{service.title}</CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {service.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
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
            <div className="relative">
              <img 
                src="/placeholder.svg" 
                alt="Enterprise Banking" 
                className="rounded-lg shadow-xl w-full h-96 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-smebank-600/20 to-smeteal-600/20 rounded-lg"></div>
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center">
                  <Briefcase className="h-6 w-6 text-smebank-600 mr-2" />
                  <div>
                    <div className="font-semibold text-gray-900">Fortune 500 Clients</div>
                    <div className="text-sm text-gray-600">Trusted by leading enterprises</div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Why Enterprises Choose Aczen
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                We understand the complexity of enterprise operations and provide sophisticated 
                financial solutions that support your strategic objectives and operational efficiency.
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
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-smebank-100">Enterprise Clients</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">₹50,000Cr+</div>
              <div className="text-smebank-100">Assets Under Management</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">25+</div>
              <div className="text-smebank-100">Countries Served</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">99.9%</div>
              <div className="text-smebank-100">System Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Trusted by Leading Enterprises
            </h2>
            <p className="text-lg text-gray-600">
              See what enterprise leaders say about our banking solutions.
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
                    <p className="text-sm text-gray-500">{testimonial.designation}, {testimonial.company}</p>
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
            Ready to Transform Your Enterprise Banking?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join leading enterprises who trust Aczen for their complex financial needs. 
            Let's discuss how we can support your business objectives.
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

export default Enterprises;