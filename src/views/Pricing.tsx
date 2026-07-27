"use client";

import React, { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Star, CreditCard, Crown } from "lucide-react";

const Pricing = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly');

  const pricingPlans = [
    {
      id: 'freemium',
      name: 'Freemium',
      tagline: 'Best for Evaluation & freelancers',
      monthlyPrice: 0,
      annualPrice: 0,
      popular: false,
      cta: { label: 'Get Started Free', url: 'https://dashboard.aczen.in/signup' },
    },
    {
      id: 'starter',
      name: 'Starter',
      tagline: 'Best for Small businesses',
      monthlyPrice: 549,
      annualPrice: 5490,
      originalMonthlyPrice: 999,
      originalAnnualPrice: 9990,
      discount: '45%',
      popular: false,
      cta: { label: 'Buy Now', url: 'https://rzp.io/rzp/start-180-1' },
    },
    {
      id: 'growth',
      name: 'Growth',
      tagline: 'Best for Growing SMEs',
      monthlyPrice: 1799,
      annualPrice: 17990,
      originalMonthlyPrice: 2999,
      originalAnnualPrice: 29990,
      discount: '40%',
      popular: true,
      cta: { label: 'Buy Now', url: 'https://rzp.io/rzp/grow-180-2' },
    },
    {
      id: 'scale',
      name: 'Scale',
      tagline: 'Best for Established businesses',
      monthlyPrice: 3999,
      annualPrice: 39990,
      originalMonthlyPrice: 4999,
      originalAnnualPrice: 49990,
      discount: '20%',
      popular: false,
      cta: { label: 'Buy Now', url: 'https://rzp.io/rzp/start-180-1' },
    },
  ];

  // Feature matrix from Aczen Bliz Pricing Strategy (v1.0). Value 'No' = not included.
  const featureCategories = [
    {
      category: 'Business & Users',
      features: [
        { name: 'Locations', values: { freemium: '1', starter: '3', growth: '5', scale: '10' } },
        { name: 'Users', values: { freemium: '1', starter: '2', growth: '5', scale: 'Unlimited' } },
        { name: 'Clients', values: { freemium: '25', starter: '500', growth: 'Unlimited', scale: 'Unlimited' } },
        { name: 'Vendors', values: { freemium: '25', starter: '500', growth: 'Unlimited', scale: 'Unlimited' } },
        { name: 'Products', values: { freemium: '50', starter: '1000', growth: 'Unlimited', scale: 'Unlimited' } },
      ],
    },
    {
      category: 'Sales',
      features: [
        { name: 'Invoices', values: { freemium: '25/mo', starter: '500/mo', growth: 'Unlimited', scale: 'Unlimited' } },
        { name: 'Quotations', values: { freemium: '20/mo', starter: 'Unlimited', growth: 'Unlimited', scale: 'Unlimited' } },
        { name: 'Sales Orders', values: { freemium: '20/mo', starter: 'Unlimited', growth: 'Unlimited', scale: 'Unlimited' } },
        { name: 'Delivery Challans', values: { freemium: '20/mo', starter: 'Unlimited', growth: 'Unlimited', scale: 'Unlimited' } },
      ],
    },
    {
      category: 'Purchases',
      features: [
        { name: 'Bills', values: { freemium: '20/mo', starter: '500/mo', growth: 'Unlimited', scale: 'Unlimited' } },
        { name: 'Expenses', values: { freemium: '20/mo', starter: '500/mo', growth: 'Unlimited', scale: 'Unlimited' } },
      ],
    },
    {
      category: 'OCR',
      features: [
        { name: 'OCR Captures', values: { freemium: '5', starter: '25', growth: '50', scale: '75' } },
      ],
    },
    {
      category: 'Accounting',
      features: [
        { name: 'Journal Entries', values: { freemium: '20/mo', starter: 'Unlimited', growth: 'Unlimited', scale: 'Unlimited' } },
        { name: 'General Ledger', values: { freemium: 'Yes', starter: 'Yes', growth: 'Yes', scale: 'Yes' } },
        { name: 'Sub-Ledgers', values: { freemium: 'Yes', starter: 'Yes', growth: 'Yes', scale: 'Yes' } },
        { name: 'Trial Balance', values: { freemium: 'Yes', starter: 'Yes', growth: 'Yes', scale: 'Yes' } },
      ],
    },
    {
      category: 'GST & Compliance',
      features: [
        { name: 'GST Calculation', values: { freemium: 'Yes', starter: 'Yes', growth: 'Yes', scale: 'Yes' } },
        { name: 'GSTR-1', values: { freemium: 'Preview', starter: 'Generate', growth: 'Generate+Export', scale: 'Auto Ready' } },
        { name: 'GSTR-3B', values: { freemium: 'Preview', starter: 'Generate', growth: 'Generate+Export', scale: 'Auto Ready' } },
        { name: 'GSTR-2A/2B', values: { freemium: 'No', starter: 'View', growth: 'Reconcile', scale: 'Smart Reconcile' } },
        { name: 'Compliance Calendar', values: { freemium: 'No', starter: 'Yes', growth: 'Yes', scale: 'Smart Alerts' } },
      ],
    },
    {
      category: 'Tax',
      features: [
        { name: 'TDS', values: { freemium: 'No', starter: 'Basic', growth: 'Advanced', scale: 'Enterprise' } },
        { name: 'TCS', values: { freemium: 'No', starter: 'Basic', growth: 'Advanced', scale: 'Enterprise' } },
        { name: 'ITR', values: { freemium: 'No', starter: 'No', growth: 'Basic', scale: 'Advanced' } },
      ],
    },
    {
      category: 'Reports',
      features: [
        { name: 'Balance Sheet', values: { freemium: 'Yes', starter: 'Yes', growth: 'Yes', scale: 'Yes' } },
        { name: 'Profit & Loss', values: { freemium: 'Yes', starter: 'Yes', growth: 'Yes', scale: 'Yes' } },
        { name: 'Cash Flow', values: { freemium: 'No', starter: 'Yes', growth: 'Yes', scale: 'Yes' } },
        { name: 'MIS', values: { freemium: 'No', starter: 'Basic', growth: 'Advanced', scale: 'Executive' } },
      ],
    },
    {
      category: 'AI',
      features: [
        { name: 'AI OCR', values: { freemium: '5', starter: '25', growth: '50', scale: '75' } },
        { name: 'AI Journal Suggestions', values: { freemium: 'No', starter: 'Yes', growth: 'Yes', scale: 'Yes' } },
        { name: 'AI CFO', values: { freemium: 'No', starter: 'No', growth: 'Limited', scale: 'Unlimited' } },
      ],
    },
  ];

  const addOns = [
    { name: 'Extra OCR (100 captures)', price: '₹199/mo' },
    { name: 'Additional User', price: '₹299/user/mo' },
    { name: 'Additional Business', price: '₹499/mo' },
    { name: 'Payroll Module', price: '₹499/mo' },
    { name: 'AI CFO Pro', price: '₹999/mo' },
    { name: 'Bank Auto Sync', price: '₹299/mo' },
    { name: 'API Access Upgrade', price: '₹999/mo' },
  ];

  // 'No' -> not included; 'Yes'/'No' need no detail text, everything else shows the value.
  const resolveFeature = (value: string) => ({
    included: value !== 'No',
    detail: value === 'Yes' || value === 'No' ? '' : value,
  });

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
      <SEO
        title="Aczen Pricing — Plans for SMEs, CAs, Startups & Enterprises"
        description="Transparent pricing for Aczen's unified financial OS. Start free, upgrade as you grow. Includes GST invoicing, expense tracking, B2B payments and CRM."
        keywords="Aczen pricing, accounting software pricing India, GST invoicing cost, SME software plans, startup accounting pricing"
        path="/pricing"
      />
      <Navbar />

      <main className="pt-16 pb-16">
        {/* Breadcrumb */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <div className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-gray-700">Home</Link>
            <span className="text-gray-400">/</span>
            <span className="text-foreground">Pricing</span>
          </div>
        </div>

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center bg-gradient-to-r from-smebank-50 to-smeteal-50 rounded-full px-6 py-3 mb-8">
              <Crown className="h-5 w-5 text-smebank-600 mr-2" />
              <span className="text-sm font-semibold text-smebank-700">Choose Your Business Growth Plan</span>
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold mb-6">
              <span className="text-foreground">Simple, Transparent</span>
              <br />
              <span className="bg-gradient-to-r from-smebank-600 to-smeteal-600 bg-clip-text text-transparent">
                Pricing
              </span>
            </h1>

            <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto">
              Scale your business with our comprehensive financial management platform.
              Choose the plan that fits your business needs and grow without limits.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center bg-white rounded-full p-1 shadow-soft mb-16 max-w-xs mx-auto">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-3 rounded-full font-semibold transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-smebank-600 text-white shadow-soft'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annually')}
                className={`px-6 py-3 rounded-full font-semibold transition-all flex items-center ${
                  billingCycle === 'annually'
                    ? 'bg-smebank-600 text-white shadow-soft'
                    : 'text-muted-foreground hover:text-foreground'
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
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative overflow-hidden rounded-2xl ${
                  plan.popular
                    ? 'ring-2 ring-smebank-500 shadow-soft-lg lg:scale-105'
                    : 'shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5'
                } transition-all duration-300`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-smebank-500 to-smeteal-500 text-white text-center py-3 font-semibold">
                    <Star className="inline h-4 w-4 mr-1" />
                    Most Popular
                  </div>
                )}

                <CardHeader className={plan.popular ? 'pt-14' : 'pt-6'}>
                  <div className="text-center">
                    <CardTitle className="text-xl font-bold text-foreground mb-1">
                      {plan.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mb-4">{plan.tagline}</p>

                    <div className="space-y-2">
                      <div className="flex items-center justify-center">
                        <span className="text-3xl font-bold text-foreground">
                          {formatPrice(getCurrentPrice(plan))}
                        </span>
                        <span className="text-muted-foreground ml-2">
                          /{billingCycle === 'monthly' ? 'month' : 'year'}
                        </span>
                      </div>

                      {plan.originalMonthlyPrice && (
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-lg text-gray-400 line-through">
                            {formatPrice(getOriginalPrice(plan))}
                          </span>
                          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                            {plan.discount} OFF
                          </Badge>
                        </div>
                      )}

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
                  <div className="space-y-4 mb-6">
                    {featureCategories.map((cat) => (
                      <div key={cat.category} className="space-y-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                          {cat.category}
                        </p>
                        {cat.features.map((feature) => {
                          const { included, detail } = resolveFeature(
                            feature.values[plan.id as keyof typeof feature.values]
                          );
                          return (
                            <div key={feature.name} className="flex items-center gap-2">
                              {included ? (
                                <Check className="h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                              ) : (
                                <X className="h-3.5 w-3.5 flex-shrink-0 text-gray-300" />
                              )}
                              <span className={`flex-1 text-xs ${
                                included ? 'text-foreground' : 'text-gray-400'
                              }`}>
                                {feature.name}
                              </span>
                              {detail && (
                                <span className="text-right text-xs font-medium text-muted-foreground">
                                  {detail}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <Button
                    className={`w-full py-4 rounded-xl font-semibold text-base shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 active:translate-y-0 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-smebank-600 to-smeteal-600 hover:from-smebank-700 hover:to-smeteal-700 text-white'
                        : 'bg-smebank-600 hover:bg-smebank-700 text-white'
                    } transition-all duration-300`}
                    onClick={() => window.open(plan.cta.url, plan.cta.url.includes('dashboard.aczen.in') ? '_self' : '_blank')}
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    {plan.cta.label}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center mt-3">
                    No setup fees • Cancel anytime • 14-day money-back guarantee
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Recommended Add-ons */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Recommended Add-ons
            </h2>
            <p className="text-muted-foreground mb-12">
              Extend any plan with modular upgrades as your business grows
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
              {addOns.map((addOn) => (
                <div
                  key={addOn.name}
                  className="flex items-center justify-between bg-white rounded-2xl border border-black/[0.06] shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 transition-all duration-300 p-4"
                >
                  <span className="text-sm font-medium text-foreground">{addOn.name}</span>
                  <span className="text-sm font-semibold text-smebank-600 whitespace-nowrap ml-3">
                    {addOn.price}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground mb-12">
              Everything you need to know about our pricing and plans
            </p>

            <div className="grid md:grid-cols-2 gap-8 text-left">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Can I switch plans anytime?</h3>
                  <p className="text-muted-foreground text-sm">
                    Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">Is there a setup fee?</h3>
                  <p className="text-muted-foreground text-sm">
                    No setup fees, no hidden costs. What you see is what you pay.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">Do you offer refunds?</h3>
                  <p className="text-muted-foreground text-sm">
                    Yes, we offer a 14-day money-back guarantee for all new subscriptions.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">What payment methods do you accept?</h3>
                  <p className="text-muted-foreground text-sm">
                    We accept all major credit cards, debit cards, UPI, and net banking through our secure payment gateway.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">Is my data secure?</h3>
                  <p className="text-muted-foreground text-sm">
                    Absolutely. We use bank-grade security with SSL encryption and comply with all data protection regulations.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">Can I get a custom plan?</h3>
                  <p className="text-muted-foreground text-sm">
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
