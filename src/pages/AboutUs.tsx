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
      image: "https://media.licdn.com/dms/image/v2/D5603AQE-le_OLA6O1g/profile-displayphoto-shrink_400_400/B56ZNwmo36G4Ag-/0/1732761018809?e=1750896000&v=beta&t=xtiLvg3Tx69qj3pRgNt4PMYarrAMmMMzUYvqooLU3XU",
      bio: "Uma Surya Srinivas B is a young and visionary entrepreneur currently serving as the Managing Director of Aczen Technologies Pvt. Ltd. since April 2nd, 2024. At just 18 years old, he founded Aczen with a mission to build innovative, tech-driven financial solutions that empower Small and Medium-sized Businesses (SMBs) across India."
    },
    {
      id: 2,
      name: "M Venkatesh",
      title: "Chief Financial Officer ",
      image: "https://media.licdn.com/dms/image/v2/D5603AQHatSD_HgUKdg/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1711353808457?e=1750896000&v=beta&t=GCWBGmNddkGu38eR5fJUBB5Mx6Ik5YnOSzxq7Ize6H4",
      bio: "Venkatesh is the Chief Financial Officer (CFO) and Co-Founder of Aczen Technologies Pvt. Ltd., where he plays a key role in shaping the company's financial strategy and operational scalability. From managing investor relations to overseeing budgeting, compliance, and growth planning, Venkatesh ensures the financial backbone of Aczen remains strong and future-ready."
    },
    {
      id: 3,
      name: "Krishna Chaitanya",
      title: "Chief Operations Officer ",
      image: "https://media.licdn.com/dms/image/v2/C5603AQFwga61yX4DtQ/profile-displayphoto-shrink_400_400/profile-displayphoto-shrink_400_400/0/1667915558282?e=1750896000&v=beta&t=aiouYCN5bv35ngnSFtITMHexQFEkJ_NBl1pW0vfg9DA",
      bio: "Krishna Chaitanya is the Chief Operating Officer (COO) of Aczen Technologies Pvt. Ltd., where he plays a pivotal role in driving the company's operational strategies, scaling internal processes, and leading global partnership efforts. An ex-Amazon professional, Krishna brings a wealth of experience in building efficient, tech-driven solutions. During his time at Amazon, he developed a strong foundation in operations, systems optimization, and product innovation — skills that now fuel Aczen's growth journey."
    },
    {
      id: 4,
      name: "Kalyan Y Nuthan",
      title: "Chief Technology Officer ",
      image: "https://media.licdn.com/dms/image/v2/D5603AQFwESSq-QaDFg/profile-displayphoto-shrink_800_800/B56ZZeZlGyGkAg-/0/1745340487132?e=1750896000&v=beta&t=bTFLGg6i6eF5XBoZL__tWlsXWdgQ0e4XhUhKva1J5T8",
      bio: "Kalyan Y Nuthan is the Chief Technology Officer (CTO) of Aczen Technologies Pvt. Ltd., where he leads the company's technology strategy and innovation. With a strong background in software development and cloud solutions, Kalyan brings a deep understanding of technology trends and their application to real-world business challenges."
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
                src="https://media.licdn.com/dms/image/v2/D5622AQGfpj1e3Pe1Qg/feedshare-shrink_800/feedshare-shrink_800/0/1728460175327?e=1748476800&v=beta&t=mrYbhEdmPqChL5feq6M_AKdRJ8VB7LRylEFbaWaVUQM" 
                alt="Leadership Team"
                className="rounded-lg shadow-xl w-full"
              />
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
                      src="https://media.licdn.com/dms/image/v2/D5622AQGzAdS99391Jw/feedshare-shrink_800/feedshare-shrink_800/0/1723666468266?e=1748476800&v=beta&t=et9Mix_ufnK5Y1wKqE_elrPjruv5aeA10RtmU-LfdPk" 
                      alt="Team Photo 1"
                      className="w-full h-40 object-cover grayscale"
                    />
                  </div>
                  <div className="rounded-lg overflow-hidden">
                    <img 
                      src="https://media.licdn.com/dms/image/v2/D5622AQHd6LWc_SfL2g/feedshare-shrink_1280/feedshare-shrink_1280/0/1725199566804?e=1748476800&v=beta&t=X4hUzsO9NxoEe1Ru998H5eOQ5yEtlN8nJ473pOwRJ5U" 
                      alt="Team Photo 2"
                      className="w-full h-40 object-cover grayscale"
                    />
                  </div>
                  <div className="rounded-lg overflow-hidden">
                    <img 
                      src="https://media.licdn.com/dms/image/v2/D5622AQHbfO3wOsgb3w/feedshare-shrink_1280/feedshare-shrink_1280/0/1729187810901?e=1748476800&v=beta&t=Ken35YwdniE8hA5qTV1c9Z_hfC8INuLK7d9Ju97IlWA" 
                      alt="Team Photo 3"
                      className="w-full h-40 object-cover grayscale"
                    />
                  </div>
                  <div className="rounded-lg overflow-hidden">
                    <img 
                      src="https://media.licdn.com/dms/image/v2/D4E22AQGJ1_wbVotLLg/feedshare-shrink_800/B4EZVx0uoaGYAk-/0/1741371404086?e=1748476800&v=beta&t=AiwG2Wxg5qpgjDe-HAGAd66Pe9mWWS5osBHc3uQg5_s" 
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