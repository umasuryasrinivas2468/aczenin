"use client";

import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Database, Code, Monitor, ArrowRight, Star, Users, Zap } from "lucide-react";

const Products = () => {
  const products = [
    {
      id: "crm",
      name: "Aczen CRM",
      description: "Comprehensive Customer Relationship Management solution designed for modern businesses.",
      icon: Database,
      color: "bg-blue-100 text-blue-600",
      gradient: "from-blue-600 to-blue-700",
      features: ["Contact Management", "Sales Pipeline", "Analytics Dashboard", "Integration APIs"],
      link: "/products/aczen-crm"
    },
    {
      id: "ide",
      name: "Aczen IDE",
      description: "Powerful Integrated Development Environment for efficient coding and collaboration.",
      icon: Code,
      color: "bg-green-100 text-green-600",
      gradient: "from-green-600 to-green-700",
      features: ["Code Editor", "Debugging Tools", "Version Control", "Team Collaboration"],
      link: "/products/aczen-ide"
    },
    {
      id: "os",
      name: "Aczen OS",
      description: "Next-generation operating system built for performance, security, and user experience.",
      icon: Monitor,
      color: "bg-smebank-100 text-smebank-600",
      gradient: "from-smebank-600 to-smebank-700",
      features: ["Modern Interface", "Enhanced Security", "Cloud Integration", "Developer Tools"],
      link: "/products/aczen-os"
    }
  ];

  const stats = [
    { number: "50K+", label: "Active Users", icon: Users },
    { number: "99.9%", label: "Uptime", icon: Zap },
    { number: "4.8/5", label: "User Rating", icon: Star }
  ];

  return (
    <div className="min-h-screen">
      <SEO
        title="Aczen Products — CRM, IDE, OS & Orbit for Indian Businesses"
        description="Explore the Aczen product suite: Aczen CRM, Aczen IDE, Aczen OS and Aczen Orbit — built to run accounting, payments, compliance and customer workflows end to end."
        keywords="Aczen products, Aczen CRM, Aczen IDE, Aczen OS, Aczen Orbit, business software India, accounting platform, CRM for SMEs"
        path="/products"
      />
      <Navbar />
      <main className="pt-24 pb-16">
        {/* Breadcrumb */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <div className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-foreground">Home</Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground">Products</span>
          </div>
        </div>

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Our Product Suite
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Discover our comprehensive range of innovative technology solutions designed to 
              empower businesses and developers with cutting-edge tools and platforms.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-2">{stat.number}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Products Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {products.map((product, index) => (
              <div key={product.id} className="bg-white rounded-2xl border border-black/[0.06] shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
                <div className={`h-2 bg-gradient-to-r ${product.gradient}`}></div>
                <div className="p-8">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 ${product.color}`}>
                    <product.icon className="w-8 h-8" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-foreground mb-4">{product.name}</h3>
                  <p className="text-muted-foreground mb-6">{product.description}</p>
                  
                  <div className="mb-6">
                    <h4 className="font-semibold text-foreground mb-3">Key Features:</h4>
                    <ul className="space-y-2">
                      {product.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <Link
                    href={product.link}
                    className={`inline-flex items-center bg-gradient-to-r ${product.gradient} text-white px-6 py-3 rounded-xl font-medium shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 group`}
                  >
                    Learn More
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Why Choose Our Products */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-3xl p-8 md:p-12">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Why Choose Aczen Products?
              </h2>
              <p className="text-lg text-muted-foreground">
                Built with innovation, designed for performance, and crafted for user experience
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">High Performance</h3>
                <p className="text-muted-foreground">Optimized for speed and efficiency to handle demanding workloads.</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">User-Centric Design</h3>
                <p className="text-muted-foreground">Intuitive interfaces designed with user experience at the forefront.</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-smebank-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-smebank-600" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Enterprise Ready</h3>
                <p className="text-muted-foreground">Scalable solutions that grow with your business needs.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Integration Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="lg:w-1/2">
              <h2 className="text-3xl font-bold text-foreground mb-6">
                Seamless Integration
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Our products are designed to work together seamlessly, creating a unified 
                ecosystem that enhances productivity and streamlines workflows across your organization.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                  <span className="text-foreground">Cross-platform compatibility</span>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                  <span className="text-foreground">API-first architecture</span>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                  <span className="text-foreground">Real-time synchronization</span>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                  <span className="text-foreground">Third-party integrations</span>
                </li>
              </ul>
              <button className="bg-gradient-to-r from-blue-600 to-smebank-600 text-white px-8 py-3 rounded-xl font-medium shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300">
                View Integration Guide
              </button>
            </div>
            <div className="lg:w-1/2">
              <img
                src="https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
                alt="Integration"
                className="rounded-2xl shadow-soft w-full"
              />
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-600 to-smebank-600 rounded-3xl p-8 md:p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-lg mb-8 opacity-90">
              Explore our products and discover how they can transform your business operations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="https://dashboard.aczen.in" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white text-blue-600 px-8 py-3 rounded-xl font-semibold shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 transition-all duration-300 text-center"
              >
                Get Started
              </a>
              <a 
                href="https://cal.com/aczen-technologies-pvt-ltd-t7jdhz/30min" 
                target="_blank" 
                rel="noopener noreferrer"
                className="border border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3 rounded-xl font-medium transition-colors text-center"
              >
                Schedule Demo
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Products;