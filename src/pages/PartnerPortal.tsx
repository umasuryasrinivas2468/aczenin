import React, { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Eye, EyeOff, Lock, Mail, AlertCircle } from "lucide-react";

const PartnerPortal = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showError, setShowError] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check credentials
    if (email === "iap@aczen.tech" && password === "Partner@2025") {
      setIsLoggedIn(true);
      setShowError(false);
    } else {
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setEmail("");
    setPassword("");
  };

  if (isLoggedIn) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="pt-24 pb-16">
          {/* Breadcrumb */}
          <div className="container mx-auto px-4 mb-8">
            <div className="flex items-center space-x-2 text-sm">
              <Link to="/" className="text-gray-500 hover:text-gray-700">Home</Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900">Partner Portal</span>
            </div>
          </div>

          {/* Welcome Section */}
          <section className="container mx-auto px-4 mb-16">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    Welcome to Partner Portal
                  </h1>
                  <p className="text-lg text-gray-600">
                    Access exclusive partner resources, tools, and collaboration opportunities.
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          </section>

          {/* Partner Dashboard */}
          <section className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Resource Access */}
              <div className="bg-white p-6 rounded-lg shadow-lg border">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Partner Resources</h3>
                <p className="text-gray-600 mb-4">Access marketing materials, documentation, and training resources.</p>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium">
                  View Resources
                </button>
              </div>

              {/* API Documentation */}
              <div className="bg-white p-6 rounded-lg shadow-lg border">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">API Documentation</h3>
                <p className="text-gray-600 mb-4">Integrate with Aczen's APIs and access technical documentation.</p>
                <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium">
                  View API Docs
                </button>
              </div>

              {/* Support Center */}
              <div className="bg-white p-6 rounded-lg shadow-lg border">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Partner Support</h3>
                <p className="text-gray-600 mb-4">Get dedicated support for your partnership needs and technical issues.</p>
                <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium">
                  Contact Support
                </button>
              </div>

              {/* Analytics Dashboard */}
              <div className="bg-white p-6 rounded-lg shadow-lg border">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Analytics</h3>
                <p className="text-gray-600 mb-4">Track your partnership performance and view detailed analytics.</p>
                <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md font-medium">
                  View Analytics
                </button>
              </div>

              {/* Training Center */}
              <div className="bg-white p-6 rounded-lg shadow-lg border">
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Training Center</h3>
                <p className="text-gray-600 mb-4">Access training materials and certification programs.</p>
                <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md font-medium">
                  Start Training
                </button>
              </div>

              {/* Partnership Opportunities */}
              <div className="bg-white p-6 rounded-lg shadow-lg border">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">New Opportunities</h3>
                <p className="text-gray-600 mb-4">Explore new partnership opportunities and collaboration projects.</p>
                <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium">
                  Explore
                </button>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-16">
        {/* Breadcrumb */}
        <div className="container mx-auto px-4 mb-8">
          <div className="flex items-center space-x-2 text-sm">
            <Link to="/" className="text-gray-500 hover:text-gray-700">Home</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">Partner Portal</span>
          </div>
        </div>

        {/* Login Section */}
        <section className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="bg-white p-8 rounded-lg shadow-lg border">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-blue-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Partner Portal</h1>
                <p className="text-gray-600">Sign in to access your partner dashboard</p>
              </div>

              {/* Error Message */}
              {showError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                  <span className="text-red-700 text-sm">Invalid credentials. Please try again.</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-md font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-300"
                >
                  Sign In
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Need help? <a href="/contacts" className="text-blue-600 hover:text-blue-700">Contact Support</a>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default PartnerPortal;