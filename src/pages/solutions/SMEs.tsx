import { ArrowRight, Building2, TrendingUp, Shield, Users, CheckCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const SMEs = () => {
  const features = [
    {
      icon: <Building2 className="h-8 w-8 text-smebank-600" />,
      title: "Business Banking Solutions",
      description: "Tailored banking services designed specifically for small and medium enterprises with competitive rates and flexible terms."
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-smebank-600" />,
      title: "Growth Financing",
      description: "Access working capital, equipment loans, and expansion funding to fuel your business growth and scale operations."
    },
    {
      icon: <Shield className="h-8 w-8 text-smebank-600" />,
      title: "Risk Management",
      description: "Comprehensive insurance solutions and risk assessment tools to protect your business from unforeseen challenges."
    },
    {
      icon: <Users className="h-8 w-8 text-smebank-600" />,
      title: "Dedicated Support",
      description: "Personal relationship managers who understand SME needs and provide expert guidance for financial decisions."
    }
  ];

  const benefits = [
    "Quick loan approvals within 24-48 hours",
    "Competitive interest rates starting from 8.5%",
    "Minimal documentation requirements",
    "Digital banking platform for easy management",
    "Cash flow management tools",
    "Multi-currency support for international trade"
  ];

  const testimonials = [
    {
      name: "Rajesh Kumar",
      company: "Kumar Textiles Pvt Ltd",
      content: "Aczen helped us expand our manufacturing unit with quick financing. Their SME-focused approach made all the difference.",
      rating: 5
    },
    {
      name: "Priya Sharma",
      company: "TechStart Solutions",
      content: "The digital banking platform is incredibly user-friendly. Managing our business finances has never been easier.",
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
              SME Solutions
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Empowering Small & Medium 
              <span className="bg-gradient-to-r from-smebank-600 to-smeteal-600 text-transparent bg-clip-text">
                {" "}Enterprises
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Unlock your business potential with our comprehensive SME banking solutions. 
              From working capital to growth financing, we're your trusted financial partner.
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
                Learn More
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
              Why SMEs Choose Aczen
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We understand the unique challenges faced by small and medium enterprises and provide solutions that drive growth.
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

      {/* Benefits Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Key Benefits for Your SME
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Our SME solutions are designed to address the specific needs of growing businesses, 
                providing the financial tools and support you need to succeed.
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
                alt="SME Business Growth" 
                className="rounded-lg shadow-xl w-full h-96 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-smebank-600/20 to-smeteal-600/20 rounded-lg"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What Our SME Clients Say
            </h2>
            <p className="text-lg text-gray-600">
              Don't just take our word for it - hear from successful SMEs who've grown with Aczen.
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
            Ready to Grow Your SME?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of successful SMEs who trust Aczen for their financial needs. 
            Start your journey to business growth today.
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

export default SMEs;