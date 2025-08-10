import { Search, HelpCircle, MessageCircle, Phone, Mail, User, DollarSign, Smartphone, CreditCard, TrendingUp, Headphones, FileText, BarChart3, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useState } from "react";

const FAQ = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const faqCategories = [
    {
      title: "Account Opening",
      icon: <User className="h-6 w-6 text-smebank-600" />,
      faqs: [
        {
          question: "What documents do I need to open an account?",
          answer: "You need a valid government-issued ID (Aadhaar, PAN, Passport, or Driving License), address proof, and recent photographs. For business accounts, additional documents like business registration and GST certificate may be required."
        },
        {
          question: "How long does it take to open an account?",
          answer: "Digital account opening takes just 10-15 minutes with instant approval. Physical verification, if required, is completed within 24-48 hours. You can start using basic services immediately after digital verification."
        },
        {
          question: "Is there a minimum balance requirement?",
          answer: "We offer zero-balance savings accounts for individuals and startups. For premium accounts and business accounts, minimum balance requirements vary from ₹10,000 to ₹1,00,000 depending on the account type."
        },
        {
          question: "Can I open an account online?",
          answer: "Yes, you can open most account types completely online through our website or mobile app. The process includes digital KYC verification using Aadhaar and video verification."
        }
      ]
    },
    {
      title: "Loans & Credit",
      icon: <DollarSign className="h-6 w-6 text-smebank-600" />,
      faqs: [
        {
          question: "What types of loans do you offer?",
          answer: "We offer personal loans, business loans, home loans, vehicle loans, education loans, and working capital financing. Each loan type has specific eligibility criteria and interest rates."
        },
        {
          question: "How quickly can I get loan approval?",
          answer: "Pre-approved customers can get instant approval. For new applications, approval typically takes 24-48 hours for personal loans and 3-7 days for business loans, depending on documentation completeness."
        },
        {
          question: "What is the interest rate for business loans?",
          answer: "Business loan interest rates start from 8.5% per annum and vary based on your credit profile, business vintage, turnover, and loan amount. We offer competitive rates for SMEs and startups."
        },
        {
          question: "Can I prepay my loan without penalties?",
          answer: "Yes, we allow partial and full prepayment of loans. For floating rate loans, there are no prepayment charges. For fixed rate loans, minimal charges may apply as per the loan agreement."
        }
      ]
    },
    {
      title: "Digital Banking",
      icon: <Smartphone className="h-6 w-6 text-smebank-600" />,
      faqs: [
        {
          question: "How do I activate mobile banking?",
          answer: "Download our mobile app, register using your account number and registered mobile number. You'll receive an OTP for verification. Set up your MPIN and you're ready to use mobile banking services."
        },
        {
          question: "Is mobile banking secure?",
          answer: "Yes, our mobile banking uses bank-grade security with 256-bit SSL encryption, two-factor authentication, biometric login, and real-time fraud monitoring to ensure your transactions are completely secure."
        },
        {
          question: "What services are available on mobile banking?",
          answer: "You can check balances, transfer funds, pay bills, recharge mobile, book FDs, apply for loans, track investments, and access customer support through our comprehensive mobile banking platform."
        },
        {
          question: "Are there any charges for digital transactions?",
          answer: "Most digital transactions are free, including NEFT, RTGS, UPI payments, and bill payments. We believe in promoting digital banking and keep charges minimal to encourage cashless transactions."
        }
      ]
    },
    {
      title: "Payments & Transfers",
      icon: <CreditCard className="h-6 w-6 text-smebank-600" />,
      faqs: [
        {
          question: "What are the transaction limits?",
          answer: "Daily transaction limits vary by account type and payment method. UPI transactions are limited to ₹1 lakh per day, NEFT/RTGS have higher limits. Limits can be customized based on your requirements."
        },
        {
          question: "How long do transfers take?",
          answer: "UPI and IMPS transfers are instant. NEFT transfers are processed in batches throughout the day. RTGS transfers are real-time during banking hours (9 AM to 4:30 PM on working days)."
        },
        {
          question: "Can I schedule future payments?",
          answer: "Yes, you can schedule one-time future payments or set up recurring payments for bills, EMIs, and SIPs through our mobile banking app and internet banking platform."
        },
        {
          question: "What should I do if a transaction fails?",
          answer: "Failed transactions are automatically reversed within 24 hours. If money is debited but transaction fails, contact our customer support immediately with transaction details for quick resolution."
        }
      ]
    },
    {
      title: "Investment Services",
      icon: <TrendingUp className="h-6 w-6 text-smebank-600" />,
      faqs: [
        {
          question: "What investment options do you provide?",
          answer: "We offer mutual funds, fixed deposits, recurring deposits, government bonds, insurance products, and wealth management services. Our investment advisors help you choose suitable options based on your goals."
        },
        {
          question: "Is there a minimum investment amount?",
          answer: "Minimum investment varies by product. SIPs can start from ₹500, FDs from ₹1,000, and lump sum mutual fund investments from ₹5,000. We cater to investors with different budget ranges."
        },
        {
          question: "How do I track my investments?",
          answer: "All your investments are visible in one dashboard through our mobile app and internet banking. You get regular statements, performance reports, and can track real-time NAV and portfolio value."
        },
        {
          question: "Can I get investment advice?",
          answer: "Yes, we provide personalized investment advice through our certified financial advisors. Premium customers get dedicated relationship managers for comprehensive wealth management services."
        }
      ]
    },
    {
      title: "Customer Support",
      icon: <Headphones className="h-6 w-6 text-smebank-600" />,
      faqs: [
        {
          question: "How can I contact customer support?",
          answer: "You can reach us through multiple channels: 24/7 phone support (1800-XXX-XXXX), live chat on website/app, email support, or visit any branch. We also have WhatsApp banking for quick queries."
        },
        {
          question: "What are your customer support hours?",
          answer: "Phone and chat support are available 24/7. Email support responds within 4 hours during business days. Branch support is available during banking hours (10 AM to 4 PM, Monday to Friday, 10 AM to 2 PM on Saturdays)."
        },
        {
          question: "How do I raise a complaint?",
          answer: "You can raise complaints through our mobile app, internet banking, customer care, or email. Each complaint gets a unique reference number and is resolved within 7 working days as per RBI guidelines."
        },
        {
          question: "Can I block my debit card online?",
          answer: "Yes, you can instantly block/unblock your debit card through mobile banking, internet banking, or by calling customer care. You can also set transaction limits and enable/disable international usage."
        }
      ]
    }
  ];

  const filteredFAQs = faqCategories.map(category => ({
    ...category,
    faqs: category.faqs.filter(faq => 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.faqs.length > 0);

  const supportChannels = [
    {
      icon: <Phone className="h-6 w-6" />,
      title: "Phone Support",
      description: "24/7 customer care",
      contact: "1800-XXX-XXXX",
      availability: "Available 24/7"
    },
    {
      icon: <MessageCircle className="h-6 w-6" />,
      title: "Live Chat",
      description: "Instant chat support",
      contact: "Chat with us",
      availability: "Available 24/7"
    },
    {
      icon: <Mail className="h-6 w-6" />,
      title: "Email Support",
      description: "Detailed query resolution",
      contact: "support@aczen.tech",
      availability: "Response within 4 hours"
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
              Help Center
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Frequently Asked 
              <span className="bg-gradient-to-r from-smebank-600 to-smeteal-600 text-transparent bg-clip-text">
                {" "}Questions
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Find quick answers to common questions about our banking services, 
              account management, loans, and digital banking features.
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Search for answers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-3 text-lg border-2 border-gray-200 focus:border-smebank-500 rounded-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Categories */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          {searchTerm === "" && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
              {faqCategories.map((category, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow duration-300 cursor-pointer text-center">
                  <CardContent className="p-4">
                    <div className="flex justify-center mb-2">{category.icon}</div>
                    <h3 className="font-semibold text-sm">{category.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">{category.faqs.length} questions</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* FAQ Accordion */}
          <div className="max-w-4xl mx-auto">
            {filteredFAQs.length === 0 && searchTerm !== "" ? (
              <div className="text-center py-12">
                <HelpCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No results found</h3>
                <p className="text-gray-500">Try searching with different keywords or browse categories above.</p>
              </div>
            ) : (
              filteredFAQs.map((category, categoryIndex) => (
                <div key={categoryIndex} className="mb-8">
                  <div className="flex items-center mb-4">
                    <div className="mr-3">{category.icon}</div>
                    <h2 className="text-2xl font-bold text-gray-900">{category.title}</h2>
                  </div>
                  
                  <Accordion type="single" collapsible className="space-y-2">
                    {category.faqs.map((faq, faqIndex) => (
                      <AccordionItem 
                        key={faqIndex} 
                        value={`${categoryIndex}-${faqIndex}`}
                        className="border border-gray-200 rounded-lg px-4"
                      >
                        <AccordionTrigger className="text-left hover:no-underline py-4">
                          <span className="font-medium text-gray-900">{faq.question}</span>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4 text-gray-600 leading-relaxed">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Support Channels */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Still Need Help?
            </h2>
            <p className="text-lg text-gray-600">
              Our support team is here to help you with any questions or concerns.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {supportChannels.map((channel, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-300 text-center">
                <CardHeader>
                  <div className="mx-auto mb-4 p-3 bg-smebank-50 rounded-full w-fit text-smebank-600">
                    {channel.icon}
                  </div>
                  <CardTitle className="text-xl">{channel.title}</CardTitle>
                  <CardDescription>{channel.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-smebank-600 mb-2">{channel.contact}</p>
                  <p className="text-sm text-gray-500 mb-4">{channel.availability}</p>
                  <Button variant="outline" className="w-full">
                    Contact Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Resources */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Popular Resources
            </h2>
            <p className="text-lg text-gray-600">
              Quick access to commonly needed information and guides.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-6 text-center">
                <FileText className="h-8 w-8 text-smebank-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Account Opening Guide</h3>
                <p className="text-sm text-gray-600 mb-4">Step-by-step process to open your account</p>
                <Button variant="outline" size="sm">Download PDF</Button>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-6 text-center">
                <Smartphone className="h-8 w-8 text-smebank-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Digital Banking Guide</h3>
                <p className="text-sm text-gray-600 mb-4">Learn to use our mobile and internet banking</p>
                <Button variant="outline" size="sm">View Guide</Button>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-6 text-center">
                <BarChart3 className="h-8 w-8 text-smebank-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Interest Rates</h3>
                <p className="text-sm text-gray-600 mb-4">Current rates for deposits and loans</p>
                <Button variant="outline" size="sm">View Rates</Button>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-6 text-center">
                <Shield className="h-8 w-8 text-smebank-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Security Tips</h3>
                <p className="text-sm text-gray-600 mb-4">Keep your account safe and secure</p>
                <Button variant="outline" size="sm">Learn More</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default FAQ;