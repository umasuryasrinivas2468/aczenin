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
      image: "https://bflplaygroundstore.blob.core.windows.net/files/646d7550-acfe-4695-8f15-bfbc056b70cf/generations/c18f24d6-1058-4edb-9026-aefbe743a7d0/raw?sv=2025-05-05&se=2025-08-17T15%3A06%3A43Z&sr=b&sp=r&sig=Ajov%2Bz266ndXfBGcssTaKiV9slQlf0d5yd3vBg88c1M%3D",
      bio: "Uma Surya Srinivas B is a young and visionary entrepreneur currently serving as the Managing Director of Aczen Technologies Pvt. Ltd. since April 2nd, 2024. At just 18 years old, he founded Aczen with a mission to build innovative, tech-driven financial solutions that empower Small and Medium-sized Businesses (SMBs) across India."
    },
    {
      id: 2,
      name: "M Venkatesh",
      title: "Chief Financial Officer ",
      image: "https://bflplaygroundstore.blob.core.windows.net/files/646d7550-acfe-4695-8f15-bfbc056b70cf/generations/ba59b11b-9e2d-4b7f-a3b2-6ec265a92cee/raw?sv=2025-05-05&se=2025-08-17T15%3A13%3A06Z&sr=b&sp=r&sig=V5QN8B%2F0dfgE6NfRlzgETK7w73%2BeA%2FDsDohydH%2FhdwA%3D",
      bio: "Venkatesh is the Chief Financial Officer (CFO) and Co-Founder of Aczen Technologies Pvt. Ltd., where he plays a key role in shaping the company's financial strategy and operational scalability. From managing investor relations to overseeing budgeting, compliance, and growth planning, Venkatesh ensures the financial backbone of Aczen remains strong and future-ready."
    },
    {
      id: 3,
      name: "Krishna Chaitanya",
      title: "Chief Operations Officer ",
      image: "https://bflplaygroundstore.blob.core.windows.net/files/8f366794-5498-4787-b0a9-7cf19f07341c/generations/b3031f15-041a-4e07-89d6-9a91cbd4a191/raw?sv=2025-05-05&se=2025-08-17T08%3A27%3A24Z&sr=b&sp=r&sig=eLpaN%2FjhIHp2voCvCdQjKp9uLQwouOu%2FH2%2F8LstwSZo%3D",
      bio: "Krishna Chaitanya is the Chief Operating Officer (COO) of Aczen Technologies Pvt. Ltd., where he plays a pivotal role in driving the company's operational strategies, scaling internal processes, and leading global partnership efforts. An ex-Amazon professional, Krishna brings a wealth of experience in building efficient, tech-driven solutions. During his time at Amazon, he developed a strong foundation in operations, systems optimization, and product innovation — skills that now fuel Aczen's growth journey."
    },
    
    {
      id: 5,
      name: "Sai N Kathik",
      title: "Chief People Officer ",
      image: "https://bflplaygroundstore.blob.core.windows.net/files/8f366794-5498-4787-b0a9-7cf19f07341c/generations/9fe82d93-349b-4b4e-a2c8-d9b1159ef0a0/raw?sv=2025-05-05&se=2025-08-17T08%3A23%3A28Z&sr=b&sp=r&sig=HWeLT%2F1y3538HE92WiMo86onSiDHVc2CMmqnG2I11S8%3D",
      bio: " Karthik is the Chief Product Officer at Aczen Technologies, driving product innovation and user experience.He leads the development of fintech tools that simplify banking, payments, and automation for SMBs.With a passion for impact, he ensures Aczen’s products are intuitive, scalable, and built for India's future."
    },
    {
    id: 6,
    name: "Devanshi",
    title: "Chief Marketing Officer (I)",
    image: "https://i.ibb.co/hF0jZym3/generation-98fb31ec-0f6b-45bc-83a4-852d4f2d6ec5.png", // replace with real image URL
    bio: "Devanshi is the Chief Marketing Officer (CMO) at Aczen Technologies Pvt. Ltd. With a creative mind and strong strategic skills, she leads the company's branding, digital marketing, and outreach initiatives. Her marketing vision plays a key role in driving awareness and engagement for Aczen's fintech innovations."
  },
    {
    id: 7,
    name: "Charitha",
    title: "Chief Design Officer",
    image: "https://bflplaygroundstore.blob.core.windows.net/files/646d7550-acfe-4695-8f15-bfbc056b70cf/generations/77877a8b-3868-4e2b-932d-5bd6e326e5ce/raw?sv=2025-05-05&se=2025-08-17T15%3A10%3A19Z&sr=b&sp=r&sig=6BYV%2BP7p6X6R2r4Ys0iGeqfaGe4dHDSTrpUgX0zvvds%3D", // replace with real image URL
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
                src="https://media.licdn.com/dms/image/v2/D5622AQFKUAB4V4xSbQ/feedshare-shrink_800/feedshare-shrink_800/0/1730377876911?e=1757548800&v=beta&t=JLkvKhpL3tPL_ecoNKJkMLF4K4dOgvCP21bNt_JTzTE" 
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
                      src="https://media.licdn.com/dms/image/v2/D5622AQHd6LWc_SfL2g/feedshare-shrink_1280/feedshare-shrink_1280/0/1725199566804?e=1757548800&v=beta&t=g8i1F5zSjhWf32nQYC-B5rZ67jsvKrOjUVcz4yvLqdI" 
                      alt="Team Photo 1"
                      className="w-full h-40 object-cover grayscale"
                    />
                  </div>
                  <div className="rounded-lg overflow-hidden">
                    <img 
                      src="https://media.licdn.com/dms/image/v2/D4E22AQGJ1_wbVotLLg/feedshare-shrink_480/B4EZVx0uoaGYAc-/0/1741371404083?e=1757548800&v=beta&t=-l_hJY9CAsdeHMK1P_timQRZLcguoJ9g-HVAMSmuAYM" 
                      alt="Team Photo 2"
                      className="w-full h-40 object-cover grayscale"
                    />
                  </div>
                  <div className="rounded-lg overflow-hidden">
                    <img 
                      src="https://media.licdn.com/dms/image/v2/D5622AQFCCpmcJsFmew/feedshare-shrink_1280/feedshare-shrink_1280/0/1729187811377?e=1757548800&v=beta&t=6QXGhf0yWLxU29Fsqbvs-H4iOXvWgOhYI3VF0HcO-M0" 
                      alt="Team Photo 3"
                      className="w-full h-40 object-cover grayscale"
                    />
                  </div>
                  <div className="rounded-lg overflow-hidden">
                    <img 
                      src="https://media.licdn.com/dms/image/v2/D5622AQFuvNQv1Nfggw/feedshare-shrink_1280/feedshare-shrink_1280/0/1725199566627?e=1757548800&v=beta&t=9Kb45ejQpSic9RVeLN8FvMOGflhFz1uq5BkHVJKT9Y4" 
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
