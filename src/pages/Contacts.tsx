import { Phone, Mail, MapPin, Clock, MessageCircle, Send, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useState } from "react";

const Contacts = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    category: "",
    message: ""
  });

  const contactMethods = [
    {
      icon: <Phone className="h-6 w-6" />,
      title: "Phone Support",
      description: "Speak with our customer care team",
      contact: "US: +1 9785588514 | India: +91 99087 54657",
      availability: "24/7 Available",
      color: "bg-blue-50 text-blue-600"
    },
    {
      icon: <Mail className="h-6 w-6" />,
      title: "Email Support",
      description: "Send us your detailed queries",
      contact: "aczen.support@aczen.in | team@aczen.in",
      availability: "Response within 4 hours",
      color: "bg-green-50 text-green-600"
    },
    {
      icon: <MessageCircle className="h-6 w-6" />,
      title: "Live Chat",
      description: "Chat with our support agents",
      contact: "Available on website & app",
      availability: "24/7 Available",
      color: "bg-purple-50 text-purple-600"
    },
    {
      icon: <Building className="h-6 w-6" />,
      title: "Office Visit",
      description: "Visit our office in Hyderabad",
      contact: "Madinaguda, Hyderabad",
      availability: "Mon-Fri: 10AM-6PM, Sat: 10AM-2PM",
      color: "bg-orange-50 text-orange-600"
    }
  ];

  const officeLocations = [
    {
      city: "Hyderabad",
      address: "Madinaguda, Hyderabad, Telangana - 500049",
      phone: "+91 99087 54657",
      type: "Head Office"
    }
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log("Form submitted:", formData);
    // Reset form or show success message
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-smebank-50 to-smeteal-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-4 bg-smebank-100 text-smebank-800 hover:bg-smebank-200">
              Contact Us
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Get in Touch 
              <span className="bg-gradient-to-r from-smebank-600 to-smeteal-600 text-transparent bg-clip-text">
                {" "}with Us
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              We're here to help you with all your banking needs. Reach out to us through any of our 
              convenient contact methods and get the support you deserve.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How Can We Help You?
            </h2>
            <p className="text-lg text-gray-600">
              Choose the most convenient way to reach us
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactMethods.map((method, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-300 text-center">
                <CardHeader>
                  <div className={`mx-auto mb-4 p-3 rounded-full w-fit ${method.color}`}>
                    {method.icon}
                  </div>
                  <CardTitle className="text-xl">{method.title}</CardTitle>
                  <CardDescription>{method.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-gray-900 mb-2">{method.contact}</p>
                  <p className="text-sm text-gray-500 mb-4">{method.availability}</p>
                  <Button variant="outline" className="w-full">
                    Contact Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form & Map */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Send Us a Message</h2>
              <Card>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          placeholder="Enter your full name"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          placeholder="Enter your email"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleInputChange("phone", e.target.value)}
                          placeholder="Enter your phone number"
                        />
                      </div>
                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Select onValueChange={(value) => handleInputChange("category", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="account">Account Related</SelectItem>
                            <SelectItem value="loans">Loans & Credit</SelectItem>
                            <SelectItem value="digital">Digital Banking</SelectItem>
                            <SelectItem value="investment">Investment Services</SelectItem>
                            <SelectItem value="complaint">Complaint</SelectItem>
                            <SelectItem value="feedback">Feedback</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="subject">Subject *</Label>
                      <Input
                        id="subject"
                        type="text"
                        value={formData.subject}
                        onChange={(e) => handleInputChange("subject", e.target.value)}
                        placeholder="Brief subject of your message"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => handleInputChange("message", e.target.value)}
                        placeholder="Please describe your query in detail..."
                        rows={5}
                        required
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-smebank-600 to-smeteal-600 hover:from-smebank-700 hover:to-smeteal-700"
                    >
                      Send Message
                      <Send className="ml-2 h-4 w-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Office Location */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Office</h2>
              <div className="space-y-4">
                {officeLocations.map((office, index) => (
                  <Card key={index} className="hover:shadow-md transition-shadow duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-xl font-semibold text-gray-900">{office.city}</h3>
                        <Badge variant="outline">{office.type}</Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-start">
                          <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-1 flex-shrink-0" />
                          <p className="text-gray-600 text-sm">{office.address}</p>
                        </div>
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 text-gray-400 mr-2" />
                          <p className="text-gray-600 text-sm">{office.phone}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Business Hours */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Business Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Monday - Friday:</span>
                      <span className="font-medium">10:00 AM - 4:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Saturday:</span>
                      <span className="font-medium">10:00 AM - 2:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sunday:</span>
                      <span className="font-medium text-red-600">Closed</span>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-gray-500">
                        * Customer care and digital services available 24/7
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Emergency Contacts */}
      <section className="py-16 bg-red-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Emergency Contacts</h2>
            <p className="text-lg text-gray-600">For urgent banking needs and security concerns</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="border-red-200 bg-white">
              <CardContent className="p-6 text-center">
                <div className="text-red-600 mb-4">
                  <Phone className="h-8 w-8 mx-auto" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Emergency Support</h3>
                <p className="text-red-600 font-bold text-lg">+91 99087 54657</p>
                <p className="text-sm text-gray-500 mt-2">Available 24/7</p>
              </CardContent>
            </Card>
            
            <Card className="border-red-200 bg-white">
              <CardContent className="p-6 text-center">
                <div className="text-red-600 mb-4">
                  <MessageCircle className="h-8 w-8 mx-auto" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Technical Support</h3>
                <p className="text-red-600 font-bold text-lg">+1 9785588514</p>
                <p className="text-sm text-gray-500 mt-2">US Support Line</p>
              </CardContent>
            </Card>
            
            <Card className="border-red-200 bg-white">
              <CardContent className="p-6 text-center">
                <div className="text-red-600 mb-4">
                  <Mail className="h-8 w-8 mx-auto" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Support Email</h3>
                <p className="text-red-600 font-bold text-sm">aczen.support@aczen.in</p>
                <p className="text-sm text-gray-500 mt-2">For all inquiries</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-smebank-600 to-smeteal-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Need Immediate Assistance?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Our support team is available 24/7 to help you with any technical needs or concerns.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-smebank-600 hover:bg-gray-100 px-8 py-3 text-lg font-semibold"
              asChild
            >
              <a href="tel:+919908754657">
                Call Now: +91 99087 54657
                <Phone className="ml-2 h-5 w-5" />
              </a>
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-white text-white hover:bg-white hover:text-smebank-600 px-8 py-3"
            >
              Start Live Chat
              <MessageCircle className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contacts;