"use client";


import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import IntegrationsStrip from "@/components/IntegrationsStrip";
import HeroDashboardMockup from "@/components/HeroDashboardMockup";
import FeaturesSection from "@/components/FeaturesSection";
import PartnersSection from "@/components/PartnersSection";
import VideoSection from "@/components/VideoSection";
import SecuritySection from "@/components/SecuritySection";
import IndustrySection from "@/components/IndustrySection";
import TestimonialsSection from "@/components/TestimonialsSection";
import FAQSection from "@/components/FAQSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const Index = () => {
  return (
    <div className="min-h-screen bg-wash-gradient">
      <SEO
        title="Aczen — Unified Financial OS for SMEs, CAs & Startups in India"
        description="Aczen brings GST invoicing, expense management, B2B payments, accounting and CRM into one platform for Indian businesses. Bank smarter. Scale faster."
        keywords="Aczen, accounting software India, GST invoicing, expense management, B2B payments, SME accounting software, CA software, startup accounting, Aczen CRM, Aczen OS, e-invoicing India, TDS compliance, financial automation, fintech India"
        path="/"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Aczen",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          offers: { "@type": "Offer", priceCurrency: "INR", price: "0" },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.8",
            reviewCount: "120",
          },
        }}
      />
      <Navbar />
      <main>
        <HeroSection />
        <IntegrationsStrip />
        <HeroDashboardMockup />
        <FeaturesSection />
        <PartnersSection />
        <VideoSection />
        <SecuritySection />
        <IndustrySection />
        <TestimonialsSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;


