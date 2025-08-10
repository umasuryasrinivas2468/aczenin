import React from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Database, Users, BarChart3, Settings, Phone, Mail, Calendar, Target, ArrowRight, Check } from "lucide-react";

const AczenCRM = () => {
  const features = [
    {
      icon: Users,
      title: "Contact Management",
      description: "Centralize all customer information with detailed profiles, interaction history, and communication preferences."
    },
    {
      icon: Target,
      title: "Sales Pipeline",
      description: "Visual sales pipeline management with customizable stages and automated workflow triggers."
    },
    {
      icon: BarChart3,
      title: "Analytics & Reporting",
      description: "Comprehensive analytics dashboard with real-time insights and customizable reports."
    },
    {
      icon: Calendar,
      title: "Task & Schedule Management",
      description: "Integrated calendar system with task automation and appointment scheduling."
    },
    {
      icon: Mail,
      title: "Email Integration",
      description: "Seamless email integration with automated campaigns and response tracking."
    },
    {
      icon: Settings,
      title: "Workflow Automation",
      description: "Automate repetitive tasks and create custom workflows to boost productivity."
    }
  ];

  const benefits = [
    "Increase sales productivity by 40%",
    "Improve customer retention rates",
    "Streamline communication processes",
    "Generate actionable business insights",
    "Reduce manual data entry tasks",
    "Enhance team collaboration"
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
            <span className="text-gray-900">Aczen CRM</span>
          </div>
        </div>

        {/* Hero Section */}
        <section className="container mx-auto px-4 mb-16">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="lg:w-1/2">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <Database className="w-6 h-6 text-blue-600" />
                </div>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  CRM Solution
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Aczen CRM
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Transform your customer relationships with our comprehensive CRM solution. 
                Manage contacts, track sales, and grow your business with powerful automation 
                and analytics tools.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a 
                  href="https://crm.aczen.tech" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-md font-medium hover:shadow-lg transition-all duration-300 text-center"
                >
                  Try Live Demo
                </a>
                <a 
                  href="https://cal.com/aczen-technologies-pvt-ltd-t7jdhz/30min" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-md font-medium text-center"
                >
                  Schedule Demo
                </a>
              </div>
            </div>
            <div className="lg:w-1/2">
              <img
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2015&q=80"
                alt="Aczen CRM Dashboard"
                className="rounded-lg shadow-xl w-full"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Powerful Features</h2>
            <p className="text-lg text-gray-600">
              Everything you need to manage customer relationships effectively
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-lg border hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Benefits Section */}
        <section className="container mx-auto px-4 mb-16">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 md:p-12">
            <div className="flex flex-col lg:flex-row gap-12 items-center">
              <div className="lg:w-1/2">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  Why Choose Aczen CRM?
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                  Our CRM solution is designed to help businesses of all sizes build stronger 
                  customer relationships and drive sustainable growth.
                </p>
                <div className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center">
                      <Check className="w-5 h-5 text-green-600 mr-3" />
                      <span className="text-gray-700">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:w-1/2">
                <img
                  src="https://images.unsplash.com/photo-1553484771-371a605b060b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
                  alt="CRM Benefits"
                  className="rounded-lg shadow-xl w-full"
                />
              </div>
            </div>
          </div>
        </section>



        {/* Integration Section */}
        <section className="container mx-auto px-4 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Seamless Integrations</h2>
            <p className="text-lg text-gray-600">
              Connect with your favorite tools and platforms
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
            {['Gmail', 'Outlook', 'Slack', 'Zoom', 'Salesforce', 'HubSpot'].map((integration, index) => (
              <div key={index} className="bg-white p-4 rounded-lg shadow border text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-2"></div>
                <span className="text-sm text-gray-600">{integration}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Call to Action */}
        <section className="container mx-auto px-4">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 md:p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Transform Your Customer Relationships?
            </h2>
            <p className="text-lg mb-8 opacity-90">
              Join thousands of businesses already using Aczen CRM to grow their revenue.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="https://crm.aczen.tech" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white text-blue-600 px-8 py-3 rounded-md font-medium hover:bg-gray-100 transition-colors flex items-center justify-center"
              >
                Try Live Demo
                <ArrowRight className="w-4 h-4 ml-2" />
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

export default AczenCRM;