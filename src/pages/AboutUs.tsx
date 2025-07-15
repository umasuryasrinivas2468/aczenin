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
      image: "https://media.licdn.com/dms/image/v2/D5603AQG_sPsDzDElVQ/profile-displayphoto-shrink_400_400/B56ZbjEPWuH4Ag-/0/1747566262232?e=1753315200&v=beta&t=SsC7qe3xyqNaKZ3kugtTzO7UtMTxloa6V5ZwpjCB9wI",
      bio: "Uma Surya Srinivas B is a young and visionary entrepreneur currently serving as the Managing Director of Aczen Technologies Pvt. Ltd. since April 2nd, 2024. At just 18 years old, he founded Aczen with a mission to build innovative, tech-driven financial solutions that empower Small and Medium-sized Businesses (SMBs) across India."
    },
    {
      id: 2,
      name: "M Venkatesh",
      title: "Chief Financial Officer ",
      image: "https://media.licdn.com/dms/image/v2/D5603AQHatSD_HgUKdg/profile-displayphoto-shrink_400_400/profile-displayphoto-shrink_400_400/0/1711353808457?e=1756944000&v=beta&t=Ymb_-iLpInEYN-PUg1CNncL-cJaNqdxA7Isu_TpmjvE",
      bio: "Venkatesh is the Chief Financial Officer (CFO) and Co-Founder of Aczen Technologies Pvt. Ltd., where he plays a key role in shaping the company's financial strategy and operational scalability. From managing investor relations to overseeing budgeting, compliance, and growth planning, Venkatesh ensures the financial backbone of Aczen remains strong and future-ready."
    },
    {
      id: 3,
      name: "Krishna Chaitanya",
      title: "Chief Operations Officer ",
      image: "https://media.licdn.com/dms/image/v2/C5603AQFwga61yX4DtQ/profile-displayphoto-shrink_400_400/profile-displayphoto-shrink_400_400/0/1667915558282?e=1756944000&v=beta&t=QECoPDnCP6BxMLrY9FtChKnnhv2yypupYk9Hi-dmYPI",
      bio: "Krishna Chaitanya is the Chief Operating Officer (COO) of Aczen Technologies Pvt. Ltd., where he plays a pivotal role in driving the company's operational strategies, scaling internal processes, and leading global partnership efforts. An ex-Amazon professional, Krishna brings a wealth of experience in building efficient, tech-driven solutions. During his time at Amazon, he developed a strong foundation in operations, systems optimization, and product innovation — skills that now fuel Aczen's growth journey."
    },
    {
      id: 4,
      name: "Kalyan Y Nuthan",
      title: "Chief Technology Officer ",
      image: "https://media.licdn.com/dms/image/v2/D5603AQFm8-wOdypR6w/profile-displayphoto-shrink_400_400/B56ZcU5l4uHgAg-/0/1748402332367?e=1756944000&v=beta&t=sK90fCoI7B5GafpsGSkOEpZEuXP0cP6xNr07SK1fQiY",
      bio: "Kalyan Y Nuthan is the Chief Technology Officer (CTO) of Aczen Technologies Pvt. Ltd., where he leads the company's technology strategy and innovation. With a strong background in software development and cloud solutions, Kalyan brings a deep understanding of technology trends and their application to real-world business challenges."
    },
    {
    id: 5,
    name: "Devanshi",
    title: "Chief Marketing Officer (I)",
    image: "https://media.licdn.com/dms/image/v2/D4D03AQGffd6zwLCp1g/profile-displayphoto-scale_400_400/B4DZgJq2XXGsAw-/0/1752508887481?e=1758153600&v=beta&t=icMOdMyq11U7k3t5TblbPn2q9J7AjuYUny51pDLt3yQ", // replace with real image URL
    bio: "Devanshi is the Chief Marketing Officer (CMO) at Aczen Technologies Pvt. Ltd. With a creative mind and strong strategic skills, she leads the company's branding, digital marketing, and outreach initiatives. Her marketing vision plays a key role in driving awareness and engagement for Aczen's fintech innovations."
  },
    {
    id: 6,
    name: "Charitha",
    title: "Head UI/UX Designer",
    image: "https://media.licdn.com/dms/image/v2/D4E03AQEX5mKNJwyqiw/profile-displayphoto-shrink_800_800/B4EZZmsOnpH0Ac-/0/1745479592961?e=1757548800&v=beta&t=gzxIQETF2JPq2tjU_gnxl3klZvqsReidHpalsr6pH10", // replace with real image URL
    bio: "Charitha leads UI/UX at Aczen with 4+ years of experience in designing intuitive, user-friendly interfaces. She has worked with top companies, shaping seamless digital experiences across platforms. Her design vision ensures every Aczen product is both visually engaging and functionally efficient."
  },
    {
      id: 7,
      name: "Sai Varshith",
      title: "Business Manager ",
      image: "https://media.licdn.com/dms/image/v2/D5635AQGAFPpDTMZ37Q/profile-framedphoto-shrink_400_400/B56ZgPL7I_HQAk-/0/1752601441595?e=1753207200&v=beta&t=lLbxDPhSR7iM4zHEbX76o6XMC1wGDq6bxPcAVR9dr90",
      bio: "Varshith serves as the Business Manager at Aczen Technologies, where he plays a key role in overseeing operations, managing strategic partnerships, and driving business growth. With a sharp understanding of market trends and a strong focus on execution, Varshith ensures that our teams stay aligned with company goals while optimizing performance across departments. His leadership and coordination skills make him an essential part of Aczen’s mission to deliver impactful fintech solutions for SMBs."
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
                src="https://media.licdn.com/dms/image/v2/D5622AQFKUAB4V4xSbQ/feedshare-shrink_800/feedshare-shrink_800/0/1730377876911?e=1754524800&v=beta&t=OEfWr38Q7tVuSvDOK96bTsl4xTRxtlJKXPZzZiI8dlE" 
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
                      src="https://media.licdn.com/dms/image/v2/D5622AQFCCpmcJsFmew/feedshare-shrink_800/feedshare-shrink_800/0/1729187811330?e=1754524800&v=beta&t=tT5SL8WETsWY--j0sIUeQ9eRTVAL0ZiDKHCkJyNRjWU" 
                      alt="Team Photo 1"
                      className="w-full h-40 object-cover grayscale"
                    />
                  </div>
                  <div className="rounded-lg overflow-hidden">
                    <img 
                      src="https://media.licdn.com/dms/image/v2/D5622AQGzAdS99391Jw/feedshare-shrink_800/feedshare-shrink_800/0/1723666468266?e=1754524800&v=beta&t=_zS80JUxodXMBl2Ab-gaXfWKAlAR955ExNV4ukMxjXw" 
                      alt="Team Photo 2"
                      className="w-full h-40 object-cover grayscale"
                    />
                  </div>
                  <div className="rounded-lg overflow-hidden">
                    <img 
                      src="https://media.licdn.com/dms/image/v2/D5622AQHqX-LF99xJ5Q/feedshare-shrink_800/feedshare-shrink_800/0/1729860765990?e=1754524800&v=beta&t=5iJuMHTpung3Dhl9omUyHmAgj_5SgdJoyfXSSfteKH0" 
                      alt="Team Photo 3"
                      className="w-full h-40 object-cover grayscale"
                    />
                  </div>
                  <div className="rounded-lg overflow-hidden">
                    <img 
                      src="https://media.licdn.com/dms/image/v2/D4E22AQGJ1_wbVotLLg/feedshare-shrink_800/B4EZVx0uoaGYAk-/0/1741371404086?e=1754524800&v=beta&t=hnovz-A2mOGe8NoMWO1CdCRcYLoXWDLjHE-sqJTVtEw" 
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
