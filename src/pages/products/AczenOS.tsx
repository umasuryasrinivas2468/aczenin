import React from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Monitor, Shield, Cloud, Cpu, Smartphone, Zap, ArrowRight, Check, Download, Laptop, Tablet, Home } from "lucide-react";

const AczenOS = () => {
  const features = [
    {
      icon: Monitor,
      title: "Modern Interface",
      description: "Sleek, intuitive design with customizable themes and adaptive layouts for optimal user experience."
    },
    {
      icon: Shield,
      title: "Enhanced Security",
      description: "Advanced security features including biometric authentication, encrypted storage, and secure boot."
    },
    {
      icon: Cloud,
      title: "Cloud Integration",
      description: "Seamless cloud synchronization across devices with automatic backup and file sharing."
    },
    {
      icon: Cpu,
      title: "Performance Optimized",
      description: "Efficient resource management and optimized kernel for maximum performance and battery life."
    },
    {
      icon: Smartphone,
      title: "Cross-Platform",
      description: "Unified experience across desktop, mobile, and tablet devices with universal apps."
    },
    {
      icon: Zap,
      title: "Developer Tools",
      description: "Built-in development environment with native support for multiple programming languages."
    }
  ];

  const systemRequirements = {
    minimum: [
      "4GB RAM",
      "64GB Storage",
      "Dual-core 2.0GHz CPU",
      "DirectX 11 compatible GPU",
      "UEFI firmware"
    ],
    recommended: [
      "8GB+ RAM",
      "256GB+ SSD",
      "Quad-core 2.5GHz+ CPU",
      "Dedicated GPU",
      "TPM 2.0 chip"
    ]
  };

  const benefits = [
    "50% faster boot times",
    "Enhanced privacy controls",
    "Universal app compatibility",
    "Advanced multitasking",
    "Built-in AI assistant",
    "Seamless device continuity"
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
            <Link to="/products" className="text-gray-500 hover:text-gray-700">Products</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">Aczen OS</span>
          </div>
        </div>

        {/* Hero Section */}
        <section className="container mx-auto px-4 mb-16">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="lg:w-1/2">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                  <Monitor className="w-6 h-6 text-purple-600" />
                </div>
                <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                  Web-Based Operating System
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Aczen OS
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Experience the future of computing with our revolutionary web-based operating system. 
                Access a full desktop environment directly from your browser with enhanced security, 
                modern workflows, and seamless connectivity across all your devices.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a 
                  href="https://os.aczen.tech" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-8 py-3 rounded-md font-medium hover:shadow-lg transition-all duration-300 flex items-center justify-center"
                >
                  <Monitor className="w-4 h-4 mr-2" />
                  Try Web OS
                </a>
                <a 
                  href="https://cal.com/aczen-technologies-pvt-ltd-t7jdhz/30min" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="border border-purple-600 text-purple-600 hover:bg-purple-50 px-8 py-3 rounded-md font-medium text-center"
                >
                  Schedule Demo
                </a>
              </div>
            </div>
            <div className="lg:w-1/2">
              <img
                src="https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2074&q=80"
                alt="Aczen OS Interface"
                className="rounded-lg shadow-xl w-full"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Revolutionary Features</h2>
            <p className="text-lg text-gray-600">
              Built from the ground up for the modern computing era
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-lg border hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* System Requirements */}
        <section className="container mx-auto px-4 mb-16">
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-8 md:p-12">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">System Requirements</h2>
              <p className="text-lg text-gray-600">
                Check if your device is compatible with Aczen OS
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Minimum Requirements</h3>
                <ul className="space-y-3">
                  {systemRequirements.minimum.map((req, index) => (
                    <li key={index} className="flex items-center">
                      <Check className="w-4 h-4 text-green-600 mr-3" />
                      <span className="text-gray-700">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border-2 border-purple-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Recommended</h3>
                <ul className="space-y-3">
                  {systemRequirements.recommended.map((req, index) => (
                    <li key={index} className="flex items-center">
                      <Check className="w-4 h-4 text-purple-600 mr-3" />
                      <span className="text-gray-700">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="container mx-auto px-4 mb-16">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="lg:w-1/2">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Why Choose Aczen OS?
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Experience computing like never before with our innovative operating system 
                that combines cutting-edge technology with user-friendly design.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center">
                    <Check className="w-5 h-5 text-purple-600 mr-3" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:w-1/2">
              <img
                src="https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2025&q=80"
                alt="OS Benefits"
                className="rounded-lg shadow-xl w-full"
              />
            </div>
          </div>
        </section>



        {/* Compatibility Section */}
        <section className="container mx-auto px-4 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Device Compatibility</h2>
            <p className="text-lg text-gray-600">
              Aczen OS runs on a wide range of devices
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: "Desktop PCs", icon: Monitor, status: "Available" },
              { name: "Laptops", icon: Laptop, status: "Available" },
              { name: "Tablets", icon: Tablet, status: "Coming Soon" },
              { name: "IoT Devices", icon: Home, status: "Beta" }
            ].map((device, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow border text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <device.icon className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{device.name}</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  device.status === 'Available' ? 'bg-green-100 text-green-800' :
                  device.status === 'Beta' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {device.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Call to Action */}
        <section className="container mx-auto px-4">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-8 md:p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">
              Ready for the Future of Computing?
            </h2>
            <p className="text-lg mb-8 opacity-90">
              Experience the revolutionary web-based operating system directly in your browser.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="https://os.aczen.tech" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white text-purple-600 px-8 py-3 rounded-md font-medium hover:bg-gray-100 transition-colors flex items-center justify-center"
              >
                <Monitor className="w-4 h-4 mr-2" />
                Try Web OS
              </a>
              <a 
                href="https://cal.com/aczen-technologies-pvt-ltd-t7jdhz/30min" 
                target="_blank" 
                rel="noopener noreferrer"
                className="border border-white text-white hover:bg-white hover:text-purple-600 px-8 py-3 rounded-md font-medium transition-colors text-center"
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

export default AczenOS;