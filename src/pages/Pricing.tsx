import React, { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Check, 
  X, 
  Star, 
  Phone, 
  Mail, 
  MessageCircle, 
  FileText,
  CreditCard,
  BarChart3,
  Users,
  Building,
  Smartphone,
  Calendar,
  Headphones,
  Crown,
  Zap,
  Shield,
  Clock
} from "lucide-react";

const Pricing = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly');

  const pricingPlans = [
    {
      id: 'starter',
      name: 'Starter',
      tagline: 'Best for Solo entrepreneurs & small businesses',
      monthlyPrice: 549,
      annualPrice: 5490,
      originalMonthlyPrice: 999,
      originalAnnualPrice: 9999,
      discount: '45%',
      popular: false,
      features: [
        { name: 'GST-Compliant Invoicing', included: true, detail: 'Unlimited' },
        { name: 'Payment Reminders', included: true, detail: 'Email only' },
        { name: 'GST Tracking & Filing Alerts', included: true, detail: 'Basic' },
        { name: 'Expense Recording', included: true, detail: 'Manual' },
        { name: 'Multi-User Access', included: false, detail: 'Not included' },
        { name: 'Business Analytics', included: true, detail: 'Basic Dashboard' },
        { name: 'Payment Gateway', included: false, detail: 'Not included' },
        { name: 'Vendor & Customer Ledgers', included: true, detail: 'Yes' },
        { name: 'Cash Flow Forecasting', included: false, detail: 'Not included' },
        { name: 'Loan Pre-Eligibility', included: false, detail: 'Not included' },
        { name: 'ERP/CRM API Access', included: false, detail: 'Not included' },
        { name: 'Account Manager', included: false, detail: 'Not included' },
        { name: 'Support', included: true, detail: 'Email' },
        { name: 'Extras', included: true, detail: 'PDF bulk invoice download' }
      ]
    },
    {
      id: 'growth',
      name: 'Growth',
      tagline: 'Best for Growing SMEs with teams',
      monthlyPrice: 1799,
      annualPrice: 17990,
      originalMonthlyPrice: 2999,
      originalAnnualPrice: 29990,
      discount: '40%',
      popular: true,
      features: [
        { name: 'GST-Compliant Invoicing', included: true, detail: 'Unlimited' },
        { name: 'Payment Reminders', included: true, detail: 'Email + SMS' },
        { name: 'GST Tracking & Filing Alerts', included: true, detail: 'Advanced (Auto Reconciliation)' },
        { name: 'Expense Recording', included: true, detail: 'Manual + Bulk Upload' },
        { name: 'Multi-User Access', included: true, detail: 'Up to 5 users' },
        { name: 'Business Analytics', included: true, detail: 'Advanced Dashboard' },
        { name: 'Payment Gateway', included: true, detail: 'Included' },
        { name: 'Vendor & Customer Ledgers', included: true, detail: 'Yes' },
        { name: 'Cash Flow Forecasting', included: false, detail: 'Not included' },
        { name: 'Loan Pre-Eligibility', included: false, detail: 'Not included' },
        { name: 'ERP/CRM API Access', included: false, detail: 'Not included' },
        { name: 'Account Manager', included: false, detail: 'Not included' },
        { name: 'Support', included: true, detail: 'Email + Chat' },
        { name: 'Extras', included: true, detail: 'White-labeled invoices' }
      ]
    },
    {
      id: 'scale',
      name: 'Scale',
      tagline: 'Best for Established SMEs & enterprises',
      monthlyPrice: 2799,
      annualPrice: 27990,
      originalMonthlyPrice: 4999,
      originalAnnualPrice: 49990,
      discount: '44%',
      popular: false,
      features: [
        { name: 'GST-Compliant Invoicing', included: true, detail: 'Unlimited' },
        { name: 'Payment Reminders', included: true, detail: 'Email + SMS + WhatsApp' },
        { name: 'GST Tracking & Filing Alerts', included: true, detail: 'Advanced + AI Error Checks' },
        { name: 'Expense Recording', included: true, detail: 'Auto Categorization' },
        { name: 'Multi-User Access', included: true, detail: 'Unlimited users' },
        { name: 'Business Analytics', included: true, detail: 'Advanced + Downloadable Reports' },
        { name: 'Payment Gateway', included: true, detail: 'Included + Custom Branding' },
        { name: 'Vendor & Customer Ledgers', included: true, detail: 'Yes' },
        { name: 'Cash Flow Forecasting', included: true, detail: 'AI-Based' },
        { name: 'Loan Pre-Eligibility', included: true, detail: 'NBFC Partner Offers' },
        { name: 'ERP/CRM API Access', included: true, detail: 'Yes' },
        { name: 'Account Manager', included: true, detail: 'Dedicated' },
        { name: 'Support', included: true, detail: 'Priority + Dedicated Manager' },
        { name: 'Extras', included: true, detail: 'Branch Consolidation' }
      ]
    }
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const getCurrentPrice = (plan: any) => {
    return billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
  };

  const getOriginalPrice = (plan: any) => {
    return billingCycle === 'monthly' ? plan.originalMonthlyPrice : plan.originalAnnualPrice;
  };

  const getSavings = (plan: any) => {
    if (billingCycle === 'annually') {
      const monthlyTotal = plan.monthlyPrice * 12;
      const annualPrice = plan.annualPrice;
      return monthlyTotal - annualPrice;
    }
    return 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <Navbar />
      
      <main className="pt-16 pb-16">
        {/* Breadcrumb */}
        <div className="container mx-auto px-4 mb-8">
          <div className="flex items-center space-x-2 text-sm">
            <Link to="/" className="text-gray-500 hover:text-gray-700">Home</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">Pricing</span>
          </div>
        </div>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center bg-gradient-to-r from-smebank-50 to-smeteal-50 rounded-full px-6 py-3 mb-8">
              <Crown className="h-5 w-5 text-smebank-600 mr-2" />
              <span className="text-sm font-semibold text-smebank-700">Choose Your Business Growth Plan</span>
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-bold mb-6">
              <span className="text-gray-900">Simple, Transparent</span>
              <br />
              <span className="bg-gradient-to-r from-smebank-600 to-smeteal-600 bg-clip-text text-transparent">
                Pricing
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
              Scale your business with our comprehensive financial management platform. 
              Choose the plan that fits your business needs and grow without limits.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center bg-white rounded-full p-1 shadow-md mb-16 max-w-xs mx-auto">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-3 rounded-full font-semibold transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-smebank-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annually')}
                className={`px-6 py-3 rounded-full font-semibold transition-all flex items-center ${
                  billingCycle === 'annually'
                    ? 'bg-smebank-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Annually
                <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-100">
                  Save 17%
                </Badge>
              </button>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="container mx-auto px-4 pb-16">
          <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {pricingPlans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative overflow-hidden ${
                  plan.popular 
                    ? 'ring-2 ring-smebank-500 shadow-2xl scale-105' 
                    : 'shadow-lg hover:shadow-xl'
                } transition-all duration-300`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-smebank-500 to-smeteal-500 text-white text-center py-3 font-semibold">
                    <Star className="inline h-4 w-4 mr-1" />
                    Most Popular
                  </div>
                )}
                
                <CardHeader className={plan.popular ? 'pt-16' : 'pt-8'}>
                  <div className="text-center">
                    <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                      {plan.name}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mb-6">{plan.tagline}</p>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-center">
                        <span className="text-4xl font-bold text-gray-900">
                          {formatPrice(getCurrentPrice(plan))}
                        </span>
                        <span className="text-gray-600 ml-2">
                          /{billingCycle === 'monthly' ? 'month' : 'year'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-lg text-gray-400 line-through">
                          {formatPrice(getOriginalPrice(plan))}
                        </span>
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                          {plan.discount} OFF
                        </Badge>
                      </div>
                      
                      {billingCycle === 'annually' && getSavings(plan) > 0 && (
                        <p className="text-sm text-green-600 font-medium">
                          Save {formatPrice(getSavings(plan))} annually
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="px-6 pb-8">
                  {/* Features List */}
                  <div className="space-y-4 mb-8">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start">
                        <div className="flex-shrink-0 mt-1">
                          {feature.included ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <X className="h-4 w-4 text-gray-300" />
                          )}
                        </div>
                        <div className="ml-3 flex-1">
                          <p className={`text-sm font-medium ${
                            feature.included ? 'text-gray-900' : 'text-gray-400'
                          }`}>
                            {feature.name}
                          </p>
                          <p className={`text-xs ${
                            feature.included ? 'text-gray-600' : 'text-gray-300'
                          }`}>
                            {feature.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Buy Now Button */}
                  <Button 
                    className={`w-full py-6 font-semibold text-lg ${
                      plan.popular
                        ? 'bg-gradient-to-r from-smebank-600 to-smeteal-600 hover:from-smebank-700 hover:to-smeteal-700 text-white shadow-lg hover:shadow-xl'
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                    } transition-all duration-300`}
                    onClick={() => {
                      const links = {
                        'starter': 'https://payments.cashfree.com/forms/aczenbilz_rate_599',
                        'growth': 'https://payments.cashfree.com/forms/aczenbilz_rate_1799',
                        'scale': 'https://payments.cashfree.com/forms/aczenbilz_rate_2799'
                      };
                      window.open(links[plan.id as keyof typeof links], '_blank');
                    }}
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    Buy Now
                  </Button>
                  
                  <p className="text-xs text-gray-500 text-center mt-3">
                    No setup fees • Cancel anytime • 14-day money-back guarantee
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Sales Call Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <Card className="overflow-hidden bg-gradient-to-br from-smebank-50 via-white to-smeteal-50 shadow-2xl">
              <CardContent className="p-12">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <div className="flex items-center mb-4">
                      <div className="bg-gradient-to-r from-smebank-500 to-smeteal-500 rounded-full p-3 mr-4">
                        <Phone className="h-6 w-6 text-white" />
                      </div>
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 px-3 py-1">
                        <Clock className="h-3 w-3 mr-1" />
                        Free 30-min consultation
                      </Badge>
                    </div>
                    
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">
                      Not sure which plan is right for you?
                    </h2>
                    
                    <p className="text-gray-600 mb-6 text-lg leading-relaxed">
                      Book a free consultation with our business experts. We'll analyze your needs 
                      and recommend the perfect plan to accelerate your business growth.
                    </p>
                    
                    <div className="space-y-3 mb-8">
                      <div className="flex items-center text-gray-700">
                        <Shield className="h-5 w-5 text-smebank-600 mr-3" />
                        <span>Personalized business analysis</span>
                      </div>
                      <div className="flex items-center text-gray-700">
                        <Zap className="h-5 w-5 text-smebank-600 mr-3" />
                        <span>Custom implementation strategy</span>
                      </div>
                      <div className="flex items-center text-gray-700">
                        <Users className="h-5 w-5 text-smebank-600 mr-3" />
                        <span>Dedicated onboarding support</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="bg-white rounded-2xl p-8 shadow-lg mb-6">
                      <div className="bg-gradient-to-r from-smebank-100 to-smeteal-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                        <Headphones className="h-10 w-10 text-smebank-600" />
                      </div>
                      
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Expert Consultation
                      </h3>
                      
                      <p className="text-gray-600 mb-4">
                        Connect with our financial technology experts
                      </p>
                      
                      <div className="flex items-center justify-center space-x-4 text-sm text-gray-500 mb-6">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>30 minutes</span>
                        </div>
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-1" />
                          <span>Video/Phone</span>
                        </div>
                      </div>
                      
                      <Button 
                        size="lg"
                        className="bg-gradient-to-r from-smebank-600 to-smeteal-600 hover:from-smebank-700 hover:to-smeteal-700 text-white px-8 py-3 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
                        onClick={() => window.open('https://cal.com/aczen-technologies-pvt-ltd-t7jdhz/30min', '_blank')}
                      >
                        <Phone className="h-5 w-5 mr-2" />
                        Book Free Consultation
                      </Button>
                    </div>
                    
                    <div className="flex justify-center space-x-6 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-1" />
                        <span>support@aczen.in</span>
                      </div>
                      <div className="flex items-center">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        <span>Live Chat</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-600 mb-12">
              Everything you need to know about our pricing and plans
            </p>
            
            <div className="grid md:grid-cols-2 gap-8 text-left">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Can I switch plans anytime?</h3>
                  <p className="text-gray-600 text-sm">
                    Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Is there a setup fee?</h3>
                  <p className="text-gray-600 text-sm">
                    No setup fees, no hidden costs. What you see is what you pay.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Do you offer refunds?</h3>
                  <p className="text-gray-600 text-sm">
                    Yes, we offer a 14-day money-back guarantee for all new subscriptions.
                  </p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">What payment methods do you accept?</h3>
                  <p className="text-gray-600 text-sm">
                    We accept all major credit cards, debit cards, UPI, and net banking through our secure payment gateway.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Is my data secure?</h3>
                  <p className="text-gray-600 text-sm">
                    Absolutely. We use bank-grade security with SSL encryption and comply with all data protection regulations.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Can I get a custom plan?</h3>
                  <p className="text-gray-600 text-sm">
                    Yes! For enterprise needs, we offer custom solutions. Contact our sales team for a personalized quote.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;