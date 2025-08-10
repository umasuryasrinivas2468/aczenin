import React from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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
      color: "bg-purple-100 text-purple-600",
      gradient: "from-purple-600 to-purple-700",
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
      <Navbar />
      <main className="pt-24 pb-16">
        {/* Breadcrumb */}
        <div className="container mx-auto px-4 mb-8">
          <div className="flex items-center space-x-2 text-sm">
            <Link to="/" className="text-gray-500 hover:text-gray-700">Home</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">Products</span>
          </div>
        </div>

        {/* Hero Section */}
        <section className="container mx-auto px-4 mb-16">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Our Product Suite
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover our comprehensive range of innovative technology solutions designed to 
              empower businesses and developers with cutting-edge tools and platforms.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="w-8 h-8 text-gray-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">{stat.number}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Products Grid */}
        <section className="container mx-auto px-4 mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {products.map((product, index) => (
              <div key={product.id} className="bg-white rounded-xl shadow-lg border hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className={`h-2 bg-gradient-to-r ${product.gradient}`}></div>
                <div className="p-8">
                  <div className={`w-16 h-16 rounded-lg flex items-center justify-center mb-6 ${product.color}`}>
                    <product.icon className="w-8 h-8" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{product.name}</h3>
                  <p className="text-gray-600 mb-6">{product.description}</p>
                  
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3">Key Features:</h4>
                    <ul className="space-y-2">
                      {product.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center text-sm text-gray-600">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <Link
                    to={product.link}
                    className={`inline-flex items-center bg-gradient-to-r ${product.gradient} text-white px-6 py-3 rounded-md font-medium hover:shadow-lg transition-all duration-300 group`}
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
        <section className="container mx-auto px-4 mb-16">
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-8 md:p-12">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Why Choose Aczen Products?
              </h2>
              <p className="text-lg text-gray-600">
                Built with innovation, designed for performance, and crafted for user experience
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">High Performance</h3>
                <p className="text-gray-600">Optimized for speed and efficiency to handle demanding workloads.</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">User-Centric Design</h3>
                <p className="text-gray-600">Intuitive interfaces designed with user experience at the forefront.</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Enterprise Ready</h3>
                <p className="text-gray-600">Scalable solutions that grow with your business needs.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Integration Section */}
        <section className="container mx-auto px-4 mb-16">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="lg:w-1/2">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Seamless Integration
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Our products are designed to work together seamlessly, creating a unified 
                ecosystem that enhances productivity and streamlines workflows across your organization.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                  <span className="text-gray-700">Cross-platform compatibility</span>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                  <span className="text-gray-700">API-first architecture</span>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                  <span className="text-gray-700">Real-time synchronization</span>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                  <span className="text-gray-700">Third-party integrations</span>
                </li>
              </ul>
              <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-md font-medium hover:shadow-lg transition-all duration-300">
                View Integration Guide
              </button>
            </div>
            <div className="lg:w-1/2">
              <img
                src="https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
                alt="Integration"
                className="rounded-lg shadow-xl w-full"
              />
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="container mx-auto px-4">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 md:p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-lg mb-8 opacity-90">
              Explore our products and discover how they can transform your business operations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="https://app.aczen.tech" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white text-blue-600 px-8 py-3 rounded-md font-medium hover:bg-gray-100 transition-colors text-center"
              >
                Get Started
              </a>
              <a 
                href="https://cal.com/aczen-technologies-pvt-ltd-t7jdhz/30min" 
                target="_blank" 
                rel="noopener noreferrer"
                className="border border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3 rounded-md font-medium transition-colors text-center"
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