import React from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Heart, Shield, Users, Target, Award, ArrowRight, AlertTriangle, MapPin, UserCheck, BookOpen } from "lucide-react";

const SocialImpact = () => {
  const impactAreas = [
    {
      icon: Shield,
      title: "Women Safety",
      description: "Empowering women through technology-driven safety solutions and awareness programs.",
      color: "bg-pink-100 text-pink-600"
    },
    {
      icon: Users,
      title: "Community Development",
      description: "Building stronger communities through financial inclusion and digital literacy programs.",
      color: "bg-blue-100 text-blue-600"
    },
    {
      icon: Target,
      title: "SME Empowerment",
      description: "Supporting small and medium enterprises with accessible financial technology solutions.",
      color: "bg-green-100 text-green-600"
    },
    {
      icon: Heart,
      title: "Social Welfare",
      description: "Contributing to social causes and supporting underprivileged communities.",
      color: "bg-red-100 text-red-600"
    }
  ];

  const womenSafetyFeatures = [
    {
      title: "Emergency Alert System",
      description: "Quick access to emergency contacts and authorities with location sharing.",
      icon: AlertTriangle
    },
    {
      title: "Safe Route Navigation",
      description: "AI-powered route suggestions prioritizing well-lit and populated areas.",
      icon: MapPin
    },
    {
      title: "Community Network",
      description: "Connect with verified community members for support and assistance.",
      icon: UserCheck
    },
    {
      title: "Safety Education",
      description: "Access to safety tips, self-defense resources, and awareness content.",
      icon: BookOpen
    }
  ];

  const achievements = [
    {
      number: "10,000+",
      label: "Women Empowered",
      description: "Through our safety initiatives"
    },
    {
      number: "50+",
      label: "Communities Reached",
      description: "Across different regions"
    },
    {
      number: "5,000+",
      label: "SMEs Supported",
      description: "With financial technology solutions"
    },
    {
      number: "100+",
      label: "Safety Workshops",
      description: "Conducted nationwide"
    }
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
            <span className="text-gray-900">Social Impact</span>
          </div>
        </div>

        {/* Hero Section */}
        <section className="container mx-auto px-4 mb-16">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Creating Positive Social Impact
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              At Aczen, we believe technology should serve humanity. Our social impact initiatives 
              focus on empowering communities, ensuring safety, and creating opportunities for all.
            </p>
          </div>

          <div className="relative rounded-xl overflow-hidden shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1559027615-cd4628902d4a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2073&q=80"
              alt="Social Impact"
              className="w-full h-96 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/70 to-purple-900/70 flex items-center justify-center">
              <div className="text-center text-white">
                <h2 className="text-3xl font-bold mb-4">Technology for Good</h2>
                <p className="text-lg">Building a safer, more inclusive digital future</p>
              </div>
            </div>
          </div>
        </section>

        {/* Impact Areas */}
        <section className="container mx-auto px-4 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Impact Areas</h2>
            <p className="text-lg text-gray-600">
              We focus on key areas where technology can make the biggest difference
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {impactAreas.map((area, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-lg border hover:shadow-xl transition-shadow">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${area.color}`}>
                  <area.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{area.title}</h3>
                <p className="text-gray-600">{area.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Women Safety Project Highlight */}
        <section className="container mx-auto px-4 mb-16">
          <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-8 md:p-12">
            <div className="flex flex-col lg:flex-row gap-12 items-center">
              <div className="lg:w-1/2">
                <div className="flex items-center mb-4">
                  <Shield className="w-8 h-8 text-pink-600 mr-3" />
                  <span className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm font-medium">
                    Featured Project
                  </span>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Women Safety Initiative
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  Our comprehensive women safety project combines cutting-edge technology with 
                  community support to create a safer environment for women everywhere. Through 
                  our mobile application and awareness programs, we're making a real difference.
                </p>
                <div className="flex flex-wrap gap-4">
                  <button className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-md font-medium flex items-center">
                    Learn More
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                  <button className="border border-pink-600 text-pink-600 hover:bg-pink-50 px-6 py-3 rounded-md font-medium">
                    Download App
                  </button>
                </div>
              </div>
              <div className="lg:w-1/2">
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2088&q=80"
                  alt="Women Safety"
                  className="rounded-lg shadow-xl w-full"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Women Safety Features */}
        <section className="container mx-auto px-4 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Safety Features</h2>
            <p className="text-lg text-gray-600">
              Comprehensive safety tools designed with women's security in mind
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {womenSafetyFeatures.map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-lg border">
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mr-4">
                    <feature.icon className="w-6 h-6 text-pink-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Impact Statistics */}
        <section className="container mx-auto px-4 mb-16">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 md:p-12 text-white">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Our Impact in Numbers</h2>
              <p className="text-lg opacity-90">
                Measuring the positive change we're creating in communities
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {achievements.map((achievement, index) => (
                <div key={index} className="text-center">
                  <div className="text-4xl font-bold mb-2">{achievement.number}</div>
                  <div className="text-xl font-semibold mb-1">{achievement.label}</div>
                  <div className="text-sm opacity-80">{achievement.description}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="container mx-auto px-4">
          <div className="bg-gray-50 rounded-xl p-8 md:p-12 text-center">
            <Award className="w-16 h-16 text-blue-600 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Join Our Mission
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Be part of our social impact initiatives. Whether you're an individual, organization, 
              or community leader, there are many ways to contribute to positive change.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-md font-medium">
                Get Involved
              </button>
              <button className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-md font-medium">
                Partner With Us
              </button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default SocialImpact;