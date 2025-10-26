import React from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const AboutUs = () => {
  // Leadership team data
  const leaders = [
    {
      id: 1,
      name: "Uma Surya Srinivas B",
      title: "Executive Chairman",
      image: "https://i.postimg.cc/wjXD48hM/DSC00517-removebg-preview-1.png",
      bio: "Uma Surya Srinivas B is a young and visionary entrepreneur currently serving as the Managing Director of Aczen Technologies Pvt. Ltd. since April 2nd, 2024. At just 18 years old, he founded Aczen with a mission to build innovative, tech-driven financial solutions that empower Small and Medium-sized Businesses (SMBs) across India."
    },
    {
      id: 2,
      name: "M Venkatesh",
      title: "Chief Financial Officer ",
      image: "https://i.postimg.cc/G2GBtvqt/1753102887969.jpg",
      bio: "Venkatesh is the Chief Financial Officer (CFO) and Co-Founder of Aczen Technologies Pvt. Ltd., where he plays a key role in shaping the company's financial strategy and operational scalability. From managing investor relations to overseeing budgeting, compliance, and growth planning, Venkatesh ensures the financial backbone of Aczen remains strong and future-ready."
    },
    
    {
      id: 5,
      name: "Sai N Kathik",
      title: "Chief People Officer ",
      image: "https://i.postimg.cc/2yX3XT6m/1746883552079.jpg",
      bio: " Karthik is the Chief Product Officer at Aczen Technologies, driving product innovation and user experience.He leads the development of fintech tools that simplify banking, payments, and automation for SMBs.With a passion for impact, he ensures Aczen’s products are intuitive, scalable, and built for India's future."
    },
    {
    id: 7,
    name: "Charitha",
    title: "Chief Design Officer",
    image: "https://i.postimg.cc/j51rp1zJ/1745479592961.jpg", // replace with real image URL
    bio: "As our Chief Design Officer, Neelam Charitha leads and shapes the creative direction of the company. She oversees UI/UX design, ensuring our digital products deliver intuitive and engaging user experiences. In addition, she manages graphic design, brand identity, and videography, bringing a cohesive visual language to everything we create. With a thoughtful approach and a keen eye for detail, she helps translate our brand vision into designs that resonate with our audience and drive meaningful impact."
  },
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
            <span className="text-gray-900">About Us</span>
          </div>
        </div>

        {/* Hero Section */}
        <section className="container mx-auto px-4 mb-16">
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="md:w-1/2">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                The Leadership Team
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Leadership is an art and We at Aczen have diverse leaders from all corners to 
                form an outstanding team helping us craft innovative products.
              </p>
              <button className="bg-gradient-to-r from-smebank-600 to-smebank-700 text-white px-6 py-3 rounded-md font-medium">
                SEE OUR NEWSROOM
              </button>
            </div>
            <div className="md:w-1/2">
              <img
                src="https://media.licdn.com/dms/image/v2/D5622AQHVM2fPE9-cEw/feedshare-shrink_2048_1536/feedshare-shrink_2048_1536/0/1730377880596?e=1762992000&v=beta&t=6RVP6qRS9iEY1abZA97yWNkIcnYZ7h_0SDN7WILA8u4" 
                alt="Leadership Team"
                className="rounded-lg shadow-xl w-full"
              />
            </div>
          </div>
        </section>

        {/* Our Story Section - Brief Introduction */}
        <section className="container mx-auto px-4 py-16 bg-gray-50 rounded-xl mb-16">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Story</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              From a small team of ambitious students to a growing fintech company with 15 members, 
              our journey has been defined by innovation, determination, and a vision to revolutionize 
              financial technology for businesses.
            </p>
            <div className="mt-8">
              <Link to="/our-story" className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-md uppercase tracking-wide inline-block">
                Read Our Story
              </Link>
            </div>
          </div>
          
          {/* Timeline Preview - Just show first two milestones */}
          <div className="max-w-2xl mx-auto flex flex-col md:flex-row gap-6 justify-center">
            <div className="bg-white p-6 rounded-lg shadow-lg md:w-1/2">
              <span className="text-red-500 font-bold">April 2, 2024</span>
              <h3 className="text-xl font-bold text-gray-900 mt-2">Company Incorporation</h3>
              <p className="text-gray-600 mt-2">Aczen Technologies Pvt. Ltd. was officially incorporated with Uma Surya Srinivas appointed as CEO at just 18 years old.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg md:w-1/2">
              <span className="text-red-500 font-bold">July 2024</span>
              <h3 className="text-xl font-bold text-gray-900 mt-2">Aczen Connect Launch</h3>
              <p className="text-gray-600 mt-2">Successfully launched Aczen Connect, our flagship platform connecting businesses with financial solutions.</p>
            </div>
          </div>
        </section>

        {/* Leadership Profiles */}
        <section className="container mx-auto px-4">
          {leaders.map(leader => (
            <div key={leader.id} className="flex flex-col md:flex-row gap-8 py-16 border-t border-gray-200">
              <div className="md:w-1/3 max-w-xs">
                <img 
                  src={leader.image} 
                  alt={leader.name} 
                  className="w-full h-72 object-cover rounded-lg shadow-md"
                />
              </div>
              <div className="md:w-2/3">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{leader.name}</h3>
                <p className="text-xl text-blue-700 mb-4">{leader.title}</p>
                <p className="text-gray-600">{leader.bio}</p>
              </div>
            </div>
          ))}
        </section>
        
        {/* Team Photos Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="flex flex-col space-y-12">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="md:w-1/2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg overflow-hidden">
                    <img 
                      src="https://media.licdn.com/dms/image/v2/D5622AQHVM2fPE9-cEw/feedshare-shrink_2048_1536/feedshare-shrink_2048_1536/0/1730377880596?e=1762992000&v=beta&t=6RVP6qRS9iEY1abZA97yWNkIcnYZ7h_0SDN7WILA8u4" 
                      alt="Team Photo 1"
                      className="w-full h-40 object-cover grayscale"
                    />
                  </div>
                  <div className="rounded-lg overflow-hidden">
                    <img 
                      src="https://i.postimg.cc/fRYqZPhm/1741371404086.jpg" 
                      alt="Team Photo 2"
                      className="w-full h-40 object-cover grayscale"
                    />
                  </div>
                  <div className="rounded-lg overflow-hidden">
                    <img 
                      src="https://i.postimg.cc/d3mRpbCh/1725199566804.jpg" 
                      alt="Team Photo 3"
                      className="w-full h-40 object-cover grayscale"
                    />
                  </div>
                  <div className="rounded-lg overflow-hidden">
                    <img 
                      src="https://i.postimg.cc/wTjs9R84/1722181927876.jpg" 
                      alt="Team Photo 4"
                      className="w-full h-40 object-cover grayscale"
                    />
                  </div>
                </div>
              </div>
              <div className="md:w-1/2">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Supporters </h3>
                <p className="text-gray-600 mb-6">
                  At Aczen, we believe in fostering a collaborative and innovative environment where diverse talents come together to create exceptional solutions. Our team members bring unique perspectives and expertise from various backgrounds, contributing to our dynamic workplace culture.
                </p>
                <p className="text-gray-600 mb-6">
                  We value creativity, integrity, and a passion for excellence. Our team is dedicated to pushing boundaries and challenging the status quo to deliver cutting-edge products that make a difference in the financial technology landscape.
                </p>
                <p className="text-gray-600">
                  Join us in our mission to transform the future of financial technology with innovative solutions that empower businesses and individuals alike.
                </p>
              </div>
            </div>
          
          </div>
        
          <div className="mt-12 flex justify-center">
            <a 
              href="https://tally.so/r/3XB2PO" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-10 rounded-md uppercase tracking-wide"
            >
              JOIN THE ACZEN TEAM
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default AboutUs; 
