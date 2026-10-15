"use client";

import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import ApplicationForm from "@/components/careers/ApplicationForm";

const Careers = () => {
  const benefits = [
    {
      title: "Health & Wellness",
      description: "Comprehensive health insurance and wellness programs for you and your family."
    },
    {
      title: "Professional Growth",
      description: "Opportunities for skill development, training, and career advancement."
    },
    {
      title: "Flexible Work",
      description: "Flexible working hours and remote work options to maintain work-life balance."
    },
    {
      title: "Collaborative Culture",
      description: "Join a diverse, innovative team working on solving real-world problems."
    },
    {
      title: "Learning Opportunities",
      description: "Access to courses, conferences, and mentorship from industry experts."
    }
  ];

  return (
    <div className="min-h-screen">
      <SEO
        title="Careers at Aczen — Join India's Unified Financial OS Team"
        description="Build the future of fintech with Aczen. Explore open engineering, design, sales and operations roles across our India offices."
        keywords="Aczen careers, fintech jobs India, Aczen hiring, engineering jobs, product jobs, startup careers"
        path="/careers"
      />
      <Navbar />
      <main className="pt-24 pb-16">
        {/* Breadcrumb */}
        <div className="container mx-auto px-4 mb-8">
          <div className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-gray-500 hover:text-gray-700">Home</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">Careers</span>
          </div>
        </div>

        {/* Hero Section */}
        <section className="container mx-auto px-4 mb-16">
          <div className="max-w-3xl mx-auto text-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Join Our Team
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                We're building the future of financial technology for SMBs. If you're passionate about innovation, fintech, and creating impact, we'd love to hear from you.
              </p>
              <p className="text-lg text-gray-600 mb-8">
                At Aczen, we believe in empowering businesses with cutting-edge solutions. Our team is growing, and we're looking for talented individuals who want to be part of this journey.
              </p>
              <a
                href="#apply"
                className="inline-block bg-[#ff914d] hover:bg-[#f57f35] text-white font-bold py-3 px-10 rounded-md transition-colors"
              >
                Apply Now
              </a>
            </div>
          </div>
        </section>

        {/* Why Join Aczen */}
        <section className="container mx-auto px-4 mb-16 py-12 bg-gray-50 rounded-xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Join Aczen?</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Be part of a mission-driven company transforming the financial technology landscape for SMBs and enterprises across India.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold text-gray-900 mb-3">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Call to Action */}
        <section id="apply" className="container mx-auto px-4 scroll-mt-28">
          <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-[#ff914d] to-[#2e77ff] px-6 md:px-10 py-8 text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-2">Ready to Make an Impact?</h2>
              <p className="text-white/90">
                Tell us about yourself and what you've built. We read every application.
              </p>
            </div>
            <div className="px-6 md:px-10 py-8">
              <ApplicationForm />
            </div>
          </div>
        </section>

        {/* Culture Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold text-gray-900 mb-8 text-center">Our Culture</h2>
            <div className="space-y-6 text-gray-600">
              <p>
                At Aczen, we foster a collaborative and innovative environment where every team member's contribution is valued. We believe in fostering diversity, creativity, and continuous learning.
              </p>
              <p>
                Our team spans various backgrounds and expertise levels, united by a shared passion for transforming financial technology and empowering SMBs across India. We celebrate successes together and learn from challenges.
              </p>
              <p>
                We're committed to creating a workplace that promotes work-life balance, professional growth, and personal development. Join us and be part of a mission to revolutionize fintech.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Careers; 