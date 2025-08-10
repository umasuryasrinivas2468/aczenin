import React from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Code, GitBranch, Bug, Users, Terminal, Zap, ArrowRight, Check, Play } from "lucide-react";

const AczenIDE = () => {
  const features = [
    {
      icon: Code,
      title: "Smart Code Editor",
      description: "Advanced syntax highlighting, auto-completion, and intelligent code suggestions powered by AI."
    },
    {
      icon: Bug,
      title: "Integrated Debugger",
      description: "Powerful debugging tools with breakpoints, variable inspection, and step-through execution."
    },
    {
      icon: GitBranch,
      title: "Version Control",
      description: "Built-in Git integration with visual diff, merge conflict resolution, and branch management."
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Real-time collaborative editing, code reviews, and team workspace management."
    },
    {
      icon: Terminal,
      title: "Integrated Terminal",
      description: "Full-featured terminal with multiple tabs, custom commands, and shell integration."
    },
    {
      icon: Zap,
      title: "Performance Optimization",
      description: "Built-in profiling tools, performance monitoring, and optimization suggestions."
    }
  ];

  const supportedLanguages = [
    "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Go", "Rust", 
    "PHP", "Ruby", "Swift", "Kotlin", "HTML", "CSS", "SQL", "JSON"
  ];

  const benefits = [
    "Boost coding productivity by 50%",
    "Reduce debugging time significantly",
    "Seamless team collaboration",
    "Multi-language support",
    "Extensible plugin architecture",
    "Cloud-based workspace sync"
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
            <span className="text-gray-900">Aczen IDE</span>
          </div>
        </div>

        {/* Hero Section */}
        <section className="container mx-auto px-4 mb-16">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="lg:w-1/2">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                  <Code className="w-6 h-6 text-green-600" />
                </div>
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  Development Environment
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Aczen IDE
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                The next-generation Integrated Development Environment designed for modern developers. 
                Code faster, debug smarter, and collaborate seamlessly with powerful AI-assisted features.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a 
                  href="https://code.aczen.tech" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-3 rounded-md font-medium hover:shadow-lg transition-all duration-300 flex items-center justify-center"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Try Online IDE
                </a>
                <a 
                  href="https://cal.com/aczen-technologies-pvt-ltd-t7jdhz/30min" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="border border-green-600 text-green-600 hover:bg-green-50 px-8 py-3 rounded-md font-medium text-center"
                >
                  Schedule Demo
                </a>
              </div>
            </div>
            <div className="lg:w-1/2">
              <img
                src="https://images.unsplash.com/photo-1461749280684-dccba630e2f6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2069&q=80"
                alt="Aczen IDE Interface"
                className="rounded-lg shadow-xl w-full"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Powerful Development Features</h2>
            <p className="text-lg text-gray-600">
              Everything you need for efficient software development
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-lg border hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Language Support Section */}
        <section className="container mx-auto px-4 mb-16">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-8 md:p-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Multi-Language Support</h2>
              <p className="text-lg text-gray-600">
                Write code in your favorite programming languages with full IDE support
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {supportedLanguages.map((language, index) => (
                <div key={index} className="bg-white p-3 rounded-lg shadow text-center">
                  <span className="text-sm font-medium text-gray-700">{language}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="container mx-auto px-4 mb-16">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="lg:w-1/2">
              <img
                src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
                alt="Developer Productivity"
                className="rounded-lg shadow-xl w-full"
              />
            </div>
            <div className="lg:w-1/2">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Why Developers Choose Aczen IDE
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Built by developers, for developers. Our IDE combines the best features from 
                popular editors with innovative AI-powered tools to enhance your coding experience.
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
          </div>
        </section>



        {/* Extensions Section */}
        <section className="container mx-auto px-4 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Extensible Platform</h2>
            <p className="text-lg text-gray-600">
              Customize your IDE with thousands of extensions and themes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: "AI Code Assistant", category: "Productivity", downloads: "1M+" },
              { name: "Docker Integration", category: "DevOps", downloads: "500K+" },
              { name: "REST Client", category: "API Testing", downloads: "750K+" },
              { name: "Theme Studio", category: "Customization", downloads: "300K+" }
            ].map((extension, index) => (
              <div key={index} className="bg-white p-4 rounded-lg shadow border">
                <div className="w-10 h-10 bg-green-100 rounded-lg mb-3"></div>
                <h3 className="font-bold text-gray-900 mb-1">{extension.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{extension.category}</p>
                <span className="text-xs text-green-600 font-medium">{extension.downloads} downloads</span>
              </div>
            ))}
          </div>
        </section>

        {/* Call to Action */}
        <section className="container mx-auto px-4">
          <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-8 md:p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Code Like Never Before?
            </h2>
            <p className="text-lg mb-8 opacity-90">
              Join millions of developers who trust Aczen IDE for their daily coding needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="https://code.aczen.tech" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white text-green-600 px-8 py-3 rounded-md font-medium hover:bg-gray-100 transition-colors flex items-center justify-center"
              >
                <Play className="w-4 h-4 mr-2" />
                Try Online IDE
              </a>
              <a 
                href="https://cal.com/aczen-technologies-pvt-ltd-t7jdhz/30min" 
                target="_blank" 
                rel="noopener noreferrer"
                className="border border-white text-white hover:bg-white hover:text-green-600 px-8 py-3 rounded-md font-medium transition-colors text-center"
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

export default AczenIDE;