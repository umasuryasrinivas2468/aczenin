import { ArrowRight, User, CreditCard, Globe, Smartphone, CheckCircle, Star, Wallet, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Freelancers = () => {
  const features = [
    {
      icon: <User className="h-8 w-8 text-smebank-600" />,
      title: "Personal Banking",
      description: "Zero-fee savings and current accounts designed for independent professionals and freelancers."
    },
    {
      icon: <CreditCard className="h-8 w-8 text-smebank-600" />,
      title: "Payment Solutions",
      description: "Accept payments from clients worldwide with integrated payment gateways and invoicing tools."
    },
    {
      icon: <Globe className="h-8 w-8 text-smebank-600" />,
      title: "International Payments",
      description: "Receive payments from global clients with competitive forex rates and minimal transfer fees."
    },
    {
      icon: <Smartphone className="h-8 w-8 text-smebank-600" />,
      title: "Mobile Banking",
      description: "Manage your finances on-the-go with our feature-rich mobile app designed for freelancers."
    }
  ];

  const benefits = [
    "Zero balance savings account",
    "Free debit card with global acceptance",
    "Instant payment notifications",
    "Tax-saving investment options",
    "Personal loan up to ₹10 lakhs",
    "24/7 customer support via chat"
  ];

  const services = [
    {
      title: "Freelancer Current Account",
      description: "Business account for professional freelancers",
      features: ["Zero balance", "Free cheque book", "Online banking"]
    },
    {
      title: "Payment Gateway",
      description: "Accept payments from clients easily",
      features: ["Multiple payment modes", "Instant settlements", "Low transaction fees"]
    },
    {
      title: "Forex Services",
      description: "International payment solutions",
      features: ["Competitive rates", "Quick transfers", "Multi-currency support"]
    },
    {
      title: "Investment Options",
      description: "Grow your freelance income",
      features: ["SIP investments", "Tax-saving funds", "Goal-based planning"]
    }
  ];

  const testimonials = [
    {
      name: "Amit Sharma",
      profession: "Graphic Designer",
      content: "The payment gateway integration made it so easy to receive payments from international clients. No more payment delays!",
      rating: 5
    },
    {
      name: "Kavya Reddy",
      profession: "Content Writer",
      content: "Zero balance account and instant notifications help me manage my freelance income efficiently. Highly recommended!",
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
              Freelancer Solutions
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Banking for 
              <span className="bg-gradient-to-r from-smebank-600 to-smeteal-600 text-transparent bg-clip-text">
                {" "}Independent Professionals
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Simplify your freelance finances with our comprehensive banking solutions. 
              From payment collection to investment planning, we've got you covered.
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
                Compare Plans
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
              Built for Freelance Success
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to manage your freelance business finances in one place.
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
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Comprehensive Freelancer Services
            </h2>
            <p className="text-lg text-gray-600">
              All the financial tools you need to run your freelance business efficiently.
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
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Why Freelancers Love Aczen
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                We understand the unique financial needs of freelancers and provide solutions 
                that help you focus on what you do best - your work.
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
                alt="Freelancer Working" 
                className="rounded-lg shadow-xl w-full h-96 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-smebank-600/20 to-smeteal-600/20 rounded-lg"></div>
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center">
                  <Wallet className="h-6 w-6 text-green-500 mr-2" />
                  <div>
                    <div className="font-semibold text-gray-900">50,000+ Freelancers</div>
                    <div className="text-sm text-gray-600">Trust Aczen for their banking</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What Freelancers Say
            </h2>
            <p className="text-lg text-gray-600">
              Hear from successful freelancers who've simplified their finances with Aczen.
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
                    <p className="text-sm text-gray-500">{testimonial.profession}</p>
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
            Ready to Simplify Your Freelance Finances?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of successful freelancers who trust Aczen for their banking needs. 
            Start your journey to financial freedom today.
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

export default Freelancers;