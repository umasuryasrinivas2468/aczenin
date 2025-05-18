import React from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const OurStory = () => {
  // Timeline data
  const timelineEvents = [
    {
      id: 1,
      date: "April 2, 2024",
      title: "Company Incorporation",
      description: "Aczen Technologies Pvt. Ltd. was officially incorporated with Uma Surya Srinivas appointed as CEO at just 18 years old."
    },
    {
      id: 2,
      date: "May 2024",
      title: "Web3 Partnerships",
      description: "Partnered with 3 leading Web3 companies to expand our blockchain and decentralized finance capabilities."
    },
    {
      id: 3,
      date: "July 2024",
      title: "Aczen Connect Launch",
      description: "Successfully launched Aczen Connect, our flagship platform connecting businesses with financial solutions."
    },
    {
      id: 4,
      date: "2025",
      title: "Cashfree Integration",
      description: "Partnered with Cashfree as our official payment aggregator, enhancing our payment processing capabilities."
    },
    {
      id: 5,
      date: "2025",
      title: "Gold Partnership",
      description: "Augoment became our official gold partner, strengthening our service offerings."
    }
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-16">
        {/* Simple Breadcrumb */}
        <div className="container mx-auto px-4 mb-8">
          <div className="flex items-center space-x-2 text-sm">
            <Link to="/" className="text-gray-500 hover:text-gray-700">Home</Link>
            <span className="text-gray-400">/</span>
            <Link to="/about" className="text-gray-500 hover:text-gray-700">About Us</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">Our Story</span>
          </div>
        </div>

        {/* Hero Section */}
        <section className="container mx-auto px-4 mb-16">
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="md:w-1/2">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Our Story
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                From a small team of ambitious students to a growing fintech company with 15 members, 
                our journey has been defined by innovation, determination, and a vision to revolutionize 
                financial technology for businesses.
              </p>
            </div>
            <div className="md:w-1/2">
              <img
                src="https://media.licdn.com/dms/image/v2/D5622AQGfpj1e3Pe1Qg/feedshare-shrink_800/feedshare-shrink_800/0/1728460175327?e=1748476800&v=beta&t=mrYbhEdmPqChL5feq6M_AKdRJ8VB7LRylEFbaWaVUQM" 
                alt="Leadership Team"
                className="rounded-lg shadow-xl w-full"
              />
            </div>
          </div>
        </section>

        {/* Beginning Story */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Humble Beginnings</h2>
            <p className="text-lg text-gray-600 mb-6">
              Aczen was founded by a group of ambitious students with a shared vision to revolutionize financial technology for small and medium businesses in India. What began as a passion project quickly evolved into a mission-driven company.
            </p>
            <p className="text-lg text-gray-600 mb-6">
              Today, our team has grown to 15 dedicated members, each bringing unique skills and perspectives to build innovative fintech solutions that address real challenges faced by businesses across the country.
            </p>
            <p className="text-lg text-gray-600 mb-10">
              Our growth journey reflects our commitment to excellence, innovation, and the relentless pursuit of creating meaningful impact in the fintech ecosystem.
            </p>
          </div>
        </section>
          
        {/* Timeline Section */}
        <section className="container mx-auto px-4 py-16 bg-gray-50 rounded-xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Journey</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Follow the key milestones that have shaped Aczen's growth and evolution from inception to present day.
            </p>
          </div>
          
          {/* Timeline */}
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-red-500"></div>
            
            <div className="space-y-24">
              {timelineEvents.map((event, index) => (
                <div key={event.id} className={`relative flex ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className="w-1/2"></div>
                  <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-4">
                    <div className="w-8 h-8 bg-red-500 rounded-full border-4 border-white shadow"></div>
                  </div>
                  <div className={`w-1/2 ${index % 2 === 0 ? 'pr-16' : 'pl-16'}`}>
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                      <span className="text-red-500 font-bold">{event.date}</span>
                      <h3 className="text-xl font-bold text-gray-900 mt-2">{event.title}</h3>
                      <p className="text-gray-600 mt-2">{event.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Vision for the Future */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Vision for the Future</h2>
            <p className="text-lg text-gray-600 mb-6">
              As we continue to grow, our vision remains clear: to create a comprehensive financial ecosystem that empowers businesses to thrive in the digital economy.
            </p>
            <p className="text-lg text-gray-600 mb-6">
              We're committed to leveraging cutting-edge technology, including Web3 and blockchain, to develop innovative solutions that address the evolving needs of businesses across India.
            </p>
            <p className="text-lg text-gray-600 mb-10">
              With strategic partnerships and a dedicated team, we're building a future where financial technology is accessible, efficient, and transformative for businesses of all sizes.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default OurStory; 