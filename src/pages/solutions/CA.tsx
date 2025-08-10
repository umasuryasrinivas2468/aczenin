import { ArrowRight, Calculator, FileText, Users, TrendingUp, CheckCircle, Star, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const CA = () => {
  const features = [
    {
      icon: <Calculator className="h-8 w-8 text-smebank-600" />,
      title: "Practice Management",
      description: "Comprehensive tools to manage your CA practice, client portfolios, and financial operations efficiently."
    },
    {
      icon: <FileText className="h-8 w-8 text-smebank-600" />,
      title: "Client Banking Solutions",
      description: "Offer your clients seamless banking services with competitive rates and professional support."
    },
    {
      icon: <Users className="h-8 w-8 text-smebank-600" />,
      title: "Referral Program",
      description: "Earn attractive commissions by referring clients to our banking services and financial products."
    },
    {
      icon: <Shield className="h-8 w-8 text-smebank-600" />,
      title: "Compliance Support",
      description: "Stay updated with regulatory changes and get support for compliance requirements and documentation."
    }
  ];

  const benefits = [
    "Dedicated CA relationship manager",
    "Priority processing for client applications",
    "Attractive referral commissions up to 1.5%",
    "Digital platform for client management",
    "Regular training and certification programs",
    "24/7 technical and operational support"
  ];

  const services = [
    {
      title: "Business Loans",
      description: "Help your clients access working capital and term loans",
      commission: "Up to 1.2%"
    },
    {
      title: "Current Accounts",
      description: "Zero balance current accounts with premium features",
      commission: "₹500 per account"
    },
    {
      title: "Trade Finance",
      description: "LC, BG, and export-import financing solutions",
      commission: "Up to 0.8%"
    },
    {
      title: "Investment Products",
      description: "Mutual funds, insurance, and wealth management",
      commission: "Up to 2%"
    }
  ];

  const testimonials = [
    {
      name: "CA Suresh Agarwal",
      firm: "Agarwal & Associates",
      content: "The referral program has significantly boosted our practice revenue. The support team is exceptional.",
      rating: 5
    },
    {
      name: "CA Meera Patel",
      firm: "Patel Financial Services",
      content: "My clients love the seamless banking experience. It's made my job much easier as their financial advisor.",
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
              CA Solutions
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Empowering 
              <span className="bg-gradient-to-r from-smebank-600 to-smeteal-600 text-transparent bg-clip-text">
                {" "}Chartered Accountants
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Partner with us to offer your clients comprehensive banking solutions while earning attractive 
              commissions. Grow your practice with our CA-focused programs.
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
                Download Brochure
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
              Why CAs Partner with Aczen
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We provide comprehensive support and tools to help you serve your clients better while growing your practice.
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

      {/* Services & Commissions Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Services & Commission Structure
            </h2>
            <p className="text-lg text-gray-600">
              Earn attractive commissions while providing value-added services to your clients.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-300 border-t-4 border-t-smebank-600">
                <CardHeader>
                  <CardTitle className="text-lg">{service.title}</CardTitle>
                  <Badge className="w-fit bg-green-100 text-green-800">
                    {service.commission}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    {service.description}
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
                alt="CA Professional" 
                className="rounded-lg shadow-xl w-full h-96 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-smebank-600/20 to-smeteal-600/20 rounded-lg"></div>
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Partnership Benefits
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Join our network of successful CAs who have enhanced their practice and increased 
                revenue through our comprehensive partnership program.
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

      {/* Testimonials Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Success Stories from Our CA Partners
            </h2>
            <p className="text-lg text-gray-600">
              Hear from CAs who have successfully grown their practice with our partnership program.
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
                    <p className="text-sm text-gray-500">{testimonial.firm}</p>
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
            Join our network of successful CAs and start earning attractive commissions 
            while providing exceptional value to your clients.
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

export default CA;